import { getDatabase } from "./connection";

export interface User {
  userId: string;
  name: string;
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const db = getDatabase();
    console.log("Connected to DB:", db.databaseName); // should print "user_service"
    console.log(userId === "ziiqii"); // should print true
    const Users = db.collection<User>("users");
    const user = await Users.findOne({ userId });
    if (!user) {
      console.log("No user in db found with userId: ", userId);
      return null;
    }
    console.log("Found user in db: ", user);
    return user;
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    throw new Error("Failed to fetch user from database");
  }
}
