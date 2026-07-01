import "dotenv/config";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "./database-url";

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const adapter = new PrismaMssql(resolveDatabaseUrl(), { schema: "dbo" });

  return new PrismaClient({ adapter });
}

export function getPrismaClient() {
  const globalForPrisma = globalThis as PrismaGlobal;

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = getPrismaClient();