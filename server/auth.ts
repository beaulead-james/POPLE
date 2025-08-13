import bcrypt from 'bcrypt';
import { admins, type Admin, type InsertAdmin } from "../shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async createAdmin(userData: Omit<InsertAdmin, 'password'> & { password: string }): Promise<Admin> {
    const hashedPassword = await this.hashPassword(userData.password);
    const [admin] = await db
      .insert(admins)
      .values({
        ...userData,
        password: hashedPassword,
      })
      .returning();
    return admin;
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }

  async validateAdmin(username: string, password: string): Promise<Admin | null> {
    const admin = await this.getAdminByUsername(username);
    if (!admin) return null;

    const isValid = await this.verifyPassword(password, admin.password);
    return isValid ? admin : null;
  }
}

export const authService = new AuthService();