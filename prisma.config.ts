import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url:
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DIRECT_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.DATABASE_URL,
  },
});
