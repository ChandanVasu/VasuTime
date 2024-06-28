require('dotenv').config();
const { MongoClient } = require('mongodb');
const { TwitterApi } = require('twitter-api-v2');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const client = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
  bearerToken: process.env.TWITTER_BEARER_TOKEN,
});

const mongoURI = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.TWIT_COLLECTION_NAME;

const postToTwitter = async () => {
  let dbClient;

  try {
    dbClient = new MongoClient(mongoURI);
    await dbClient.connect();
    const db = dbClient.db(dbName);
    const collection = db.collection(collectionName);

    const queryResult = await collection.findOne({ tweetPost: false });
    if (!queryResult || !queryResult.twitter) {
      console.log('No content found in the database.');
      return;
    }

    const contentToSend = queryResult.twitter;
    const featuredImage = queryResult.featuredImage;

    const rwClient = client.readWrite;

    if (featuredImage) {
      await mediaTweet(rwClient, contentToSend, featuredImage);
    } else {
      await textTweet(rwClient, contentToSend);
    }

    await collection.updateOne(
      { _id: queryResult._id },
      { $set: { tweetPost: true } }
    );
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (dbClient) {
      await dbClient.close();
    }
  }
};

const textTweet = async (rwClient, content) => {
  try {
    await rwClient.v2.tweet(content);
    console.log('Text-only tweet posted successfully.');
  } catch (error) {
    console.error('Error posting text-only tweet:', error);
  }
};

const downloadImage = async (url, filepath) => {
  const response = await axios({ url, responseType: 'stream' });
  return new Promise((resolve, reject) => {
    response.data.pipe(fs.createWriteStream(filepath))
      .on('finish', () => resolve(filepath))
      .on('error', e => reject(e));
  });
};

const mediaTweet = async (rwClient, content, imageUrl) => {
  try {
    const imagePath = path.join(__dirname, 'image.jpg');
    await downloadImage(imageUrl, imagePath);
    const mediaId = await rwClient.v1.uploadMedia(imagePath);
    await rwClient.v2.tweet({ text: content, media: { media_ids: [mediaId] } });
    console.log('Tweet with media posted successfully.');
    fs.unlinkSync(imagePath);
  } catch (error) {
    console.error('Error posting tweet with media:', error);
  }
};

// postToTwitter();

module.exports = postToTwitter;
