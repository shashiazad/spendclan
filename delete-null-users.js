require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL;

  if (!connectionString) {
    console.log("No database connection string found in environment variables. Skipping cleanup.");
    return;
  }

  console.log("Connecting to database to clean up users with NULL mobileNumber...");

  const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

  const client = new Client({
    connectionString,
    ssl: isLocal ? false : {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    // Delete any users who have a NULL mobileNumber to allow the unique NOT NULL constraint to be created
    const result = await client.query('DELETE FROM "User" WHERE "mobileNumber" IS NULL');
    console.log(`Cleanup complete. Deleted ${result.rowCount} user(s) with NULL mobileNumber.`);
  } catch (error) {
    console.error("Error running database pre-build cleanup:", error);
  } finally {
    await client.end();
  }
}

main();
