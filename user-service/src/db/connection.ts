import { MongoClient, Db } from "mongodb";

let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  const mongoUri = process.env.MONGO_URI || "mongodb://root:password@mongo:27017/?authSource=admin";
  const dbName = process.env.MONGO_DB_NAME || "user_service";

  if (!mongoUri || !dbName) {
    throw new Error("Missing MONGO_URI or MONGO_DB_NAME environment variables");
  }

  try {
    client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db(dbName);
    console.log(`Connected to MongoDB database: ${dbName}`);
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
