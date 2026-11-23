const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Configuring SQLite optimizations...");
  
  const journalMode = await prisma.$queryRawUnsafe(`PRAGMA journal_mode = WAL;`);
  console.log("Journal Mode:", journalMode);

  const busyTimeout = await prisma.$queryRawUnsafe(`PRAGMA busy_timeout = 5000;`);
  console.log("Busy Timeout:", busyTimeout);

  const synchronous = await prisma.$queryRawUnsafe(`PRAGMA synchronous = NORMAL;`);
  console.log("Synchronous:", synchronous);

  const cacheSize = await prisma.$queryRawUnsafe(`PRAGMA cache_size = 10000;`);
  console.log("Cache Size:", cacheSize);

  const tempStore = await prisma.$queryRawUnsafe(`PRAGMA temp_store = MEMORY;`);
  console.log("Temp Store:", tempStore);

  const currentMode = await prisma.$queryRawUnsafe(`PRAGMA journal_mode;`);
  console.log("Verified current journal_mode:", currentMode);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
