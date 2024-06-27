require('dotenv').config();

const scrapeData = require('./scrap.js');
const rewrite = require('./write.js');
const twitterPost = require('./twitter.js');

async function main() {
  try {
    await scrapeData();
    await rewrite();
    await twitterPost();
  } catch (error) {
    console.error('Error executing main function:', error);
  }
}

// Call main immediately and then every 10 seconds
main();
setInterval(main, 10000);

module.exports = main;
