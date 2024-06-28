const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const rewrite = require('../../controllers/ai.js');
const twitterPost = require('../../controllers/twitter.js');

const mongoURI = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.COLLECTION_NAME;

const indiaTodayTitileClass = "#section .articles h2"; // Update with correct selector
const indiaTodayContentClass = ".full-details p"; // Update with correct selector
const indiaTodayImageClass = ".custom-caption img"; // Update with correct selector
const categories = ["India", "News"];

const url = 'https://indianexpress.com/section/business/'; // Corrected the assignment operator

const scrapeIndianExpress = async () => {
  let client;

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const firstNewsHeading = $(indiaTodayTitileClass).first();
    const newsHeading = firstNewsHeading.text().trim();
    const newsLink = firstNewsHeading.find('a').attr('href');

    if (!newsLink) {
      throw new Error('No news link found.');
    }

    const { data: linkData } = await axios.get(newsLink);
    const link$ = cheerio.load(linkData);
    const articleContent = link$(indiaTodayContentClass).text().trim();
    const featuredImage = link$(indiaTodayImageClass).first().attr('src');

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
};

async function main() {
  try {
    const scrapeResult = await scrapeIndianExpress();
    if (scrapeResult) {
      await rewrite();
      await twitterPost();
    }
  } catch (error) {
    console.error('Error executing main function:', error);
  }
}

// main();

module.exports = main;
