import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import "dotenv/config";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export { PrismaClient };
export type { User, ApiKey, Company, Model, Provider, ModelProviderMapping, OnrampTransaction, Conversation } from "./generated/prisma/client.js";