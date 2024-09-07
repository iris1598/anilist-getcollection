const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

const url = 'https://anilist.co/user/miku1598/animelist';

axios.get(url,{ 
  headers: {
    'Cache-Control': 'no-cache' // 告诉浏览器不要缓存响应
  }
})
  .then(response => {
    const html = response.data;
    const $ = cheerio.load(html);

    // 定义针对“Watching”、“Completed”和“Rewatching”的选择器
    const sectionSelectors = [
      { name: 'Watching', selector: 'h3:contains("Watching")' },
      { name: 'Completed', selector: 'h3:contains("Completed")' },
      { name: 'Rewatching', selector: 'h3:contains("Rewatching")' },
      { name: 'Planning', selector: 'h3:contains("Planning")' }
    ];

    // 用于存储“Watching”、“Completed”和“Rewatching”动画的数组
    const watchingResults = [];
    const completedResults = [];
    const rewatchingResults = [];
    const planningResults = [];

    // 遍历所有可能的分类
    sectionSelectors.forEach(section => {
      // 找到当前分类的h3标签
      const sectionH3 = $(section.selector);
      if (sectionH3.length) {
        // 找到当前分类的列表部分
        const listSelector = sectionH3.next();
        $(listSelector).find('.entry').each((index, element) => {
          const cover = $(element).find('.image').css('background-image');
          const coverUrl = cover ? cover.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '') : null;
          const title = $(element).find('.title').text().trim();
          const progress = $(element).find('.progress').text().trim();
          const id = $(element).find('a').attr('href').match(/\/anime\/(\d+)/)[1];
          const format = $(element).find('.format').text().trim();
          let score = $(element).find('.score').text().trim();
          if (score === '') {
            score = '-'; // 如果评分是空字符串，则设置为'-'
          } else {
            score = parseInt(score, 10); // 如果评分不是空字符串，则转换为整数
          }
          switch (section.name) {
            case 'Watching':
              watchingResults.push({
                id: id,
                title: title,
                type: format, 
                cover: coverUrl,
                score: score,
                des: '-', // 描述未提供
                wish: '-', // 愿望未提供
                doing: '-', // 进行中未提供
                collect: '-', // 收藏未提供
                totalCount: progress, 
                myComment: '' // 评论未提供
              });
              break;
            case 'Completed':
              completedResults.push({
                id: id,
                title: title,
                type: format, 
                cover: coverUrl,
                score: score,
                des: '-', // 描述未提供
                wish: '-', // 愿望未提供
                doing: '-', // 进行中未提供
                collect: '-', // 收藏未提供
                totalCount: progress, 
                myComment: '' // 评论未提供
              });
              break;
            case 'Rewatching':
              rewatchingResults.push({
                id: id,
                title: title,
                type: format, 
                cover: coverUrl,
                score: score,
                des: '-', // 描述未提供
                wish: '-', // 愿望未提供
                doing: '-', // 进行中未提供
                collect: '-', // 收藏未提供
                totalCount: progress, 
                myComment: '' // 评论未提供
              });
              break;
            case 'Planning':
              planningResults.push({
                id: id,
                title: title,
                type: '动画', 
                cover: coverUrl,
                score: score,
                des: '-', // 描述未提供
                wish: '-', // 愿望未提供
                doing: '-', // 进行中未提供
                collect: '-', // 收藏未提供
                totalCount: progress, 
                myComment: '' // 评论未提供
              });
              break;
          }
        });
      }
    });

    // 将结果数组转换为JSON字符串
    const json = JSON.stringify({
      watching: watchingResults,
      watched: completedResults,
      rewatching: rewatchingResults,
      wantWatch: planningResults
    }, null, 2);

    // 打印JSON字符串
    console.log(json);

    // 将JSON字符串写入文件
    fs.writeFileSync(`anilist.json`, json, 'utf8');
  })
  .catch(error => {
    console.error('Error fetching the URL:', error);
  });
