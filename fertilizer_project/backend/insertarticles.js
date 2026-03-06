// insertarticles.js
const { MongoClient } = require("mongodb");
const path = require("path");

// your MongoDB Atlas URI
const uri = "mongodb+srv://agriadviser:sandy%400711@cluster1.19u4pk4.mongodb.net/fertilizer_project?retryWrites=true&w=majority&appName=Cluster1";

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db("fertilizer_project");
    const col = db.collection("articles");

    console.log("✅ Connected to MongoDB");

    // Clear old records (optional)
    await col.deleteMany({});
    console.log("🗑️ Old articles deleted");

    // Load JSON file
    const articles = require(path.join(__dirname, "articles.json"));

    // Clean each doc
    const cleaned = articles.map((a) => {
      const doc = { ...a };
      delete doc._id;
      return doc;
    });

    // Insert all articles
    const result = await col.insertMany(cleaned);
    console.log(`✅ Inserted ${result.insertedCount} articles`);
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.close();
    console.log("🔒 Connection closed");
  }
}

run();
