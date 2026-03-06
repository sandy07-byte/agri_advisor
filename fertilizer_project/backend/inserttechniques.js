// inserttechniques.js
const { MongoClient } = require("mongodb");
const path = require("path");

// Local MongoDB (or replace with your Atlas URI)
const uri = "mongodb+srv://agriadviser:sandy%400711@cluster1.19u4pk4.mongodb.net/fertilizer_project?retryWrites=true&w=majority&appName=Cluster1";

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db("fertilizer_project"); // your DB name
    const col = db.collection("techniques"); // new collection

    console.log("✅ Connected to MongoDB");

    // Delete old records (optional)
    await col.deleteMany({});
    console.log("🗑️ Old techniques deleted");

    // Load JSON file
    const techniques = require(path.join(__dirname, "techniques.json"));

    // Clean docs so Mongo assigns ObjectId and backend can map fields
    const cleaned = techniques.map((t) => {
      const doc = { ...t }
      // Remove any provided ids to avoid string _id problems
      delete doc._id
      return doc
    })

    // Insert all techniques
    const result = await col.insertMany(cleaned, { ordered: false });
    console.log(`✅ Inserted ${result.insertedCount} techniques`);

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.close();
    console.log("🔒 Connection closed");
  }
}

run();
