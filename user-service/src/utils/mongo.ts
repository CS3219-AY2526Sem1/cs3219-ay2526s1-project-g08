import { MongoClient, Db } from "mongodb";

const MONGO_URI = process.env.MONGO_URI || "mongodb://root:password@mongo:27017/?authSource=admin";
const client = new MongoClient(MONGO_URI);

let db: Db;

export async function getDb() {
  if (!db) {
    await client.connect();
    db = client.db("user_service");
  }
  return db;
}
