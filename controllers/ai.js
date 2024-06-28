require('dotenv').config();
const { MongoClient } = require('mongodb');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GOOGLE_API_KEY;
const mongoURI = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const scrapeCollectionName = process.env.SCRAPE_COLLECTION_NAME;
const uploadCollectionName = process.env.UPLOAD_COLLECTION_NAME;

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: 'application/json',
};

async function generateContent() {
  let client;

  try {
    client = new MongoClient(mongoURI);
    await client.connect();
    const db = client.db(dbName);
    const scrapeCollection = db.collection(scrapeCollectionName);

    const queryResult = await scrapeCollection.findOne({ rewrite: false }, { sort: { date: 1 } });
    if (!queryResult || !queryResult.content) {
      console.log('No content found in the database or already rewritten.');
      return;
    }

    const contentToSend = queryResult.content;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: 'You are tasked with rewriting a news article to ensure it is well-structured, engaging, and factual. Craft a concise and informative title that captures the essence of the story. Your detailed content should provide comprehensive information, covering the main points succinctly and accurately. Additionally, create a condensed version suitable for Twitter, incorporating relevant emojis to enhance engagement and only 260 twit text Characters.',
    });

    const chatSession = model.startChat({ generationConfig });
    const result = await chatSession.sendMessage(contentToSend);
    const parsedData = JSON.parse(result.response.text());

    const { title, content, twitter } = parsedData;

    await scrapeCollection.updateOne(
      { _id: queryResult._id },
      { $set: { rewrite: true } }
    );

    const uploadCollection = db.collection(uploadCollectionName);
    const uploadContent = await uploadCollection.insertOne({
      title,
      content,
      twitter,
      featuredImage: queryResult.featuredImage,
      date: new Date(),
      tweetPost: false,
    });

    console.log('Document inserted with _id:', uploadContent.insertedId);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

module.exports = generateContent;
