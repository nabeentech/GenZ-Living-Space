import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // Apply SQLite high-performance tuning pragmas once on initialization
  void (async () => {
    try {
      await client.$queryRawUnsafe(`PRAGMA journal_mode = WAL;`);
      await client.$queryRawUnsafe(`PRAGMA busy_timeout = 5000;`);
      await client.$queryRawUnsafe(`PRAGMA synchronous = NORMAL;`);
      await client.$queryRawUnsafe(`PRAGMA cache_size = -64000;`); // 64 MB page cache
      await client.$queryRawUnsafe(`PRAGMA mmap_size = 268435456;`); // 256 MB memory-mapped I/O
      await client.$queryRawUnsafe(`PRAGMA temp_store = MEMORY;`);
    } catch {
      // Ignore if database isn't SQLite or pragmas are restricted
    }
  })();

  return client;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
