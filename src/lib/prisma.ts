import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // Apply SQLite performance tuning pragmas on initialization
  client.$queryRawUnsafe(`PRAGMA journal_mode = WAL;`).catch(() => {});
  client.$queryRawUnsafe(`PRAGMA busy_timeout = 5000;`).catch(() => {});
  client.$queryRawUnsafe(`PRAGMA synchronous = NORMAL;`).catch(() => {});
  client.$queryRawUnsafe(`PRAGMA cache_size = 10000;`).catch(() => {});
  client.$queryRawUnsafe(`PRAGMA temp_store = MEMORY;`).catch(() => {});

  return client;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
