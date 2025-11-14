import { getDatabase } from "./connection";

export interface User {
  userId: string;
  name: string;
  role: "user" | "admin";
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const db = getDatabase();
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

export async function updateUserRole(
  userId: string,
  role: "user" | "admin"
): Promise<boolean> {
  try {
    const db = getDatabase();
    const Users = db.collection<User>("users");
    const result = await Users.updateOne({ userId }, { 
      $set: { role } 
    });
    return result.modifiedCount > 0;
  } catch (error) {
    console.error("Error updating user role:", error);
    throw new Error("Failed to update user role");
  }
}
