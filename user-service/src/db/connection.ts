import { MongoClient, Db } from "mongodb";

let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  const mongoUri =
    process.env.MONGO_URI ||
    "mongodb://dummy:dummy@mongo:27017/?authSource=admin";
  const dbName = "user_service";

  if (mongoUri.includes("dummy")) {
    throw new Error("Missing MONGO_URI environment variable");
  }

  try {
    client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db(dbName);
    // Extract host/cluster part for logging (removes credentials)
    let safeUri = mongoUri;
    try {
      const uriNoCreds = mongoUri.replace(/:\/\/.*@/, "://");
      const match = uriNoCreds.match(/^(mongodb(?:\+srv)?:\/\/[^/?]+)/);
      safeUri = match ? match[1] : uriNoCreds;
    } catch {}
    console.log(`Connected to MongoDB database: user_service at ${safeUri}`);
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error(
      "Database not initialized. Call connectToDatabase() first."
    );
  }
  return db;
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    console.log("MongoDB connection closed");
  }
}
