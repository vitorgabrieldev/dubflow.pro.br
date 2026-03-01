import { defineConfig, devices } from "@playwright/test";

const E2E_BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://127.0.0.1:18000";
const E2E_BACKEND_API_URL = process.env.E2E_API_BASE_URL ?? `${E2E_BACKEND_URL}/api/v1`;
const E2E_FRONTEND_PORT = process.env.E2E_FRONTEND_PORT ?? "3100";
const E2E_FRONTEND_URL = process.env.E2E_BASE_URL ?? `http://localhost:${E2E_FRONTEND_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: E2E_FRONTEND_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: "php ../artisan serve --env=testing --host=127.0.0.1 --port=18000",
          env: {
            ...process.env,
            APP_ENV: "testing",
            APP_CONFIG_CACHE: "/tmp/dubflow-e2e-config.php",
            DB_CONNECTION: process.env.E2E_DB_CONNECTION ?? "mysql",
            DB_HOST: process.env.E2E_DB_HOST ?? "127.0.0.1",
            DB_PORT: process.env.E2E_DB_PORT ?? "3306",
            DB_DATABASE: process.env.E2E_DB_DATABASE ?? "studiodublagem_tests",
            DB_USERNAME: process.env.E2E_DB_USERNAME ?? "projetos",
            DB_PASSWORD: process.env.E2E_DB_PASSWORD ?? "",
          },
          url: "http://127.0.0.1:18000/up",
          timeout: 120_000,
          reuseExistingServer: false,
        },
        {
          command: `npx next dev --hostname localhost --port ${E2E_FRONTEND_PORT}`,
          env: {
            ...process.env,
            INTERNAL_API_URL: process.env.INTERNAL_API_URL ?? E2E_BACKEND_API_URL,
            NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? E2E_BACKEND_API_URL,
          },
          url: E2E_FRONTEND_URL,
          timeout: 120_000,
          reuseExistingServer: false,
        },
      ],
});
