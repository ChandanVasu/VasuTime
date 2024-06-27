const { MongoClient } = require('mongodb');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();


const url = "https://www.ndtv.com/us-elections";
const mongoURI = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.COLLECTION_NAME;



async function scrapeData() {
  let client;

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const firstNewsHeading = $('.newsHdng').first();
    const newsHeading = firstNewsHeading.text().trim();
    const newsLink = firstNewsHeading.find('a').attr('href');

    if (!newsLink) {
      throw new Error('No news link found.');
    }

    const { data: linkData } = await axios.get(newsLink);
    const link$ = cheerio.load(linkData);
    const articleContent = link$('.ins_storybody p').text().trim();
    const featuredImage = link$('.ins_instory_dv_cont img').first().attr('src');

    client = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const existingPost = await collection.findOne({ title: newsHeading });
    if (existingPost) {
      console.log('Post already stored');
      return;
    }

    const result = await collection.insertOne({
      title: newsHeading,
      link: newsLink,
      content: articleContent,
      date: new Date(),
      rewrite: false,
      featuredImage: featuredImage || null,
    });

    console.log('Document inserted with _id:', result.insertedId);
  } catch (error) {
    console.error('Error fetching and storing data:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

scrapeData()

module.exports = scrapeData;
