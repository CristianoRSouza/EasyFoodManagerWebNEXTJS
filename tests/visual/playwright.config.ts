import { defineConfig } from "@playwright/test";

const LEGACY = "../easyfoodmanagerWEB";

export default defineConfig({
  testDir: ".",
  timeout: 90_000,
  workers: 1,
  use: { colorScheme: "dark", locale: "pt-BR", timezoneId: "America/Sao_Paulo" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    { command: "node --experimental-strip-types tests/visual/fake-api.ts lan 4999", url: "http://127.0.0.1:4999/health", cwd: "../.." },
    { command: "node --experimental-strip-types tests/visual/fake-api.ts cloud 4998", url: "http://127.0.0.1:4998/health", cwd: "../.." },
    {
      command: "npm run dev -- --port 8080 --strictPort",
      cwd: `../../${LEGACY}`,
      url: "http://localhost:8080/login",
      env: { VITE_API_URL: "http://127.0.0.1:4999", VITE_CLOUD_MODE: "", VITE_CLOUD_API: "" },
      timeout: 120_000,
    },
    {
      command: "npm run dev -- --port 8081 --strictPort",
      cwd: `../../${LEGACY}`,
      url: "http://localhost:8081/login",
      env: { VITE_API_URL: "", VITE_CLOUD_MODE: "true", VITE_CLOUD_API: "true", VITE_CLOUD_API_TARGET: "http://127.0.0.1:4998" },
      timeout: 120_000,
    },
    {
      command: "npx next start --port 3000",
      cwd: "../..",
      url: "http://localhost:3000/login",
      env: { BACKEND: "lan", EASYFOOD_API_URL: "http://127.0.0.1:4999" },
    },
    {
      command: "npx next start --port 3001",
      cwd: "../..",
      url: "http://localhost:3001/login",
      env: { BACKEND: "cloud", EASYFOOD_API_URL: "http://127.0.0.1:4998" },
    },
  ],
});
