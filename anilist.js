const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const userListUrl = 'https://anilist.co/user/miku1598/animelist';
const anilistApiUrl = 'https://graphql.anilist.co';
const query = `
  query ($id: Int) {
    Media (id: $id, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
      format
      coverImage {
        large
      }
      averageScore
      episodes
      status
      description (asHtml: false)
    }
  }
`;

const saveProgressToJson = (data, filePath) => {
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, json, 'utf8');
};

const fetchAnimeDetails = async (animeIds, category) => {
  const animeDetailsPromises = [];

  for (const animeId of animeIds) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds

    const promise = axios.post(anilistApiUrl, {
      query: query,
      variables: { id: parseInt(animeId) }
    }).then(response => {
      const animeDetail = response.data.data.Media;
      return animeDetail;
    }).catch(error => {
      console.error(`Error fetching details for anime ID ${animeId}:`, error);
      return null;
    });

    animeDetailsPromises.push(promise);
  }

  return Promise.all(animeDetailsPromises).then(details => {
    const filteredDetails = details.filter(detail => detail !== null);
    return { category, details: filteredDetails };
  });
};

axios.get(userListUrl, {
  headers: {
    'Cache-Control': 'no-cache'
  }
})
  .then(response => {
    const html = response.data;
    const $ = cheerio.load(html);
    const watchingAnimeIds = [];
    const completedAnimeIds = [];
    const planningAnimeIds = [];

    const sectionSelectors = {
      Watching: 'h3:contains("Watching")',
      Completed: 'h3:contains("Completed")',
      Planning: 'h3:contains("Planning")'
    };

    Object.keys(sectionSelectors).forEach(category => {
      const selector = sectionSelectors[category];
      const animeIds = category === 'Watching' ? watchingAnimeIds
                      : category === 'Completed' ? completedAnimeIds
                      : planningAnimeIds;

      $(selector).next().find('.entry').each((index, element) => {
        const animeId = $(element).find('a').attr('href').match(/\/anime\/(\d+)/)[1];
        animeIds.push(animeId);
      });
    });

    // Now that fetchAnimeDetails is async, we need to handle it properly
    const fetchAllAnimeDetails = async () => {
      try {
        const allAnimeDetailsPromises = [
          fetchAnimeDetails(watchingAnimeIds, 'Watching'),
          fetchAnimeDetails(completedAnimeIds, 'Completed'),
          fetchAnimeDetails(planningAnimeIds, 'Planning')
        ];

        const results = await Promise.all(allAnimeDetailsPromises);
        const combinedAnimeDetails = results.reduce((acc, result) => {
          acc[result.category] = result.details;
          saveProgressToJson(acc, 'anilist_details.json'); // Save progress after each category is processed
          return acc;
        }, {});

        // Final save after all categories are processed
        saveProgressToJson(combinedAnimeDetails, 'anilist_details_final.json');
      } catch (error) {
        console.error('Error fetching anime details:', error);
      }
    };

    fetchAllAnimeDetails();
  })
  .catch(error => {
    console.error('Error fetching the URL:', error);
  });
