// insertArticles.js
const { MongoClient } = require('mongodb')
const fs = require('fs')
const path = require('path')

const uri = "mongodb+srv://agriadviser:sandy%400711@cluster1.19u4pk4.mongodb.net/fertilizer_project?retryWrites=true&w=majority&appName=Cluster1";
const client = new MongoClient(uri)

async function run() {
  try {
    await client.connect()
    const db = client.db('fertilizer_project')

    console.log('Connected to MongoDB ✅')

    // Drop and recreate the collection to avoid leftover indexes/docs
    const colName = 'articles'
    const existing = await db.listCollections({ name: colName }).toArray()
    if (existing.length) {
      try { await db.collection(colName).drop(); console.log("Dropped existing 'articles' collection ✅") } catch (e) { console.log("⚠️ Drop failed or not needed:", e?.message) }
    }
    const col = db.collection(colName)

    // Load JSON relative to this file
    const articlesPath = path.join(__dirname, 'articles.json')
    const raw = fs.readFileSync(articlesPath, 'utf-8')
    const articles = JSON.parse(raw)

    // Clean docs so Mongo assigns ObjectId and backend can map fields
    const cleaned = articles.map((a) => {
      const doc = { ...a }
      // Remove any provided ids to avoid string _id problems
      delete doc._id
      delete doc.id
      if (doc.image_url && !doc.image) doc.image = doc.image_url
      return doc
    })

    const result = await col.insertMany(cleaned, { ordered: false })
    console.log(`✅ Inserted ${result.insertedCount} new articles`)  } catch (err) {
    console.error('❌ Error:', err)
  } finally {
    await client.close()
    console.log('Connection closed 🔒')
  }
}

run()
