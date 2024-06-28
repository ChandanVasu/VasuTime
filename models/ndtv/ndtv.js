const { MongoClient } = require('mongodb');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();
const rewrite = require('../../controllers/ai.js');
const twitterPost = require('../../controllers/twitter.js');

const url = "https://www.ndtv.com/world/india-global";

const mongoURI = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.COLLECTION_NAME;

const ndtvTitleClass = ".newsHdng";
const ndtvContentClass = ".ins_storybody p";
const ndtvImageClass = ".ins_instory_dv_cont img";
const categories = ["World", "elections"];

async function scrapeData() {
  let client;

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const firstNewsHeading = $(ndtvTitleClass).first();
    const newsHeading = firstNewsHeading.text().trim();
    const newsLink = firstNewsHeading.find('a').attr('href');

    if (!newsLink) {
      throw new Error('No news link found.');
    }

    const { data: linkData } = await axios.get(newsLink);
    const link$ = cheerio.load(linkData);
    const articleContent = link$(ndtvContentClass).text().trim();
    const featuredImage = link$(ndtvImageClass).first().attr('src');

    client = new MongoClient(mongoURI);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const existingPost = await collection.findOne({ title: newsHeading });
    if (existingPost) {
      console.log('Post already stored');
      return false;
    }

    const result = await collection.insertOne({
      title: newsHeading,
      link: newsLink,
      content: articleContent,
      date: new Date(),
      rewrite: false,
      featuredImage: featuredImage || null,
      categories: categories
    });

    console.log('Document inserted with _id:', result.insertedId);
    return true;

  } catch (error) {
    console.error('Error fetching and storing data:', error);
    return false;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function main() {
  try {
    const scrapeResult = await scrapeData();
    if (scrapeResult) {
      // Uncomment these lines if you want to perform additional actions
      await rewrite();
      await twitterPost();
    }
  } catch (error) {
    console.error('Error executing main function:', error);
  }
}

// Run main function after defining it
// main();

module.exports = main;
