import { defineConfig, devices } from "@playwright/test";
import { e2eDatabaseUrl } from "./e2e/db";

const PORT = 3100;
const databaseUrl = e2eDatabaseUrl();

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Tests share one database that is reset before each test, so run them one at a time
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    colorScheme: "dark",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium-mobile", use: { ...devices["Pixel 7"] } },
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "webkit-mobile", use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/api/auth/csrf`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: databaseUrl,
      DIRECT_URL: databaseUrl,
      POSTGRES_URL_NON_POOLING: databaseUrl,
      POSTGRES_PRISMA_URL: databaseUrl,
      POSTGRES_URL: databaseUrl,
      NEXTAUTH_URL: `http://localhost:${PORT}`,
      NEXTAUTH_SECRET: "e2e-only-not-a-real-secret",
      // Never send real email from tests
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: "1",
      SMTP_SECURE: "false",
      LLM_API_KEY: "",
    },
  },
});
