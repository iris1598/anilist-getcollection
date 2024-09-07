const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const userListUrl = ' ';//e.g.:'https://anilist.co/user/xxxxxx/animelist'
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

const printProgressBar = (current, total, category, index) => {
  process.stdout.moveCursor(0, -index); // Move to the correct line
  process.stdout.clearLine(0); // Clear the current line
  const percentage = (current / total) * 100;
  const barLength = 20;
  const filledBarLength = Math.round(percentage / (100 / barLength));
  const emptyBarLength = barLength - filledBarLength;
  const bar = '='.repeat(filledBarLength) + ' '.repeat(emptyBarLength);
  process.stdout.write(`Progress for ${category}: [${bar}] ${percentage.toFixed(2)}%\n`);
  process.stdout.moveCursor(0, index); // Move back to the bottom
};

const fetchAnimeDetails = async (animeIds, category, index) => {
  const animeDetailsPromises = [];
  let currentIndex = 0;

  for (const animeId of animeIds) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds

    const promise = axios.post(anilistApiUrl, {
      query: query,
      variables: { id: parseInt(animeId) }
    }).then(response => {
      currentIndex++;
      printProgressBar(currentIndex, animeIds.length, category, index);
      return response.data.data.Media;
    }).catch(error => {
      currentIndex++;
      printProgressBar(currentIndex, animeIds.length, category, index);
      console.error(`Error fetching details for anime ID ${animeId}:`, error);
      return null;
    });

    animeDetailsPromises.push(promise);
  }

  return Promise.all(animeDetailsPromises).then(details => {
    return { category, details: details.filter(detail => detail !== null) };
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
    const animeLists = ['Watching', 'Completed', 'Planning'].map(category => ({
      category,
      animeIds: []
    }));

    animeLists.forEach(item => {
      $(`h3:contains("${item.category}")`).next().find('.entry').each((index, element) => {
        const animeId = $(element).find('a').attr('href').match(/\/anime\/(\d+)/)[1];
        item.animeIds.push(animeId);
      });
    });

    const fetchAllAnimeDetails = async () => {
      try {
        const allAnimeDetailsPromises = animeLists.map((item, index) => {
          return fetchAnimeDetails(item.animeIds, item.category, index);
        });

        const results = await Promise.all(allAnimeDetailsPromises);
        const combinedAnimeDetails = results.reduce((acc, result) => {
          acc[result.category] = result.details;
          return acc;
        }, {});

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
