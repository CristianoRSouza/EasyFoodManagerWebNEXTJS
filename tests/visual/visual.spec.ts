import { expect, test, type Page } from "@playwright/test";
import { MAX_DIFF_RATIO, diffRatio } from "./compare";

const APPS = {
  lan: { legacy: "http://localhost:8080", next: "http://localhost:3000" },
  cloud: { legacy: "http://localhost:8081", next: "http://localhost:3001" },
} as const;

type Scenario = {
  name: string;
  mode: keyof typeof APPS;
  /** Leva a página ao estado a comparar. Roda igual nos dois apps. */
  reach(page: Page, base: string): Promise<void>;
  /**
   * Recorte da comparação. Padrão: a tela inteira. O cenário da nuvem compara só o
   * seletor: o cabeçalho de nuvem do legado ainda tem plano/licença/IA (Fase 5).
   */
  region?(page: Page): ReturnType<Page["locator"]>;
};

async function login(page: Page, base: string, email: string) {
  await page.goto(`${base}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill("qualquer");
  await page.getByRole("button", { name: "Entrar" }).click();
}

const scenarios: Scenario[] = [
  { name: "login-loja", mode: "lan", reach: async (p, b) => { await p.goto(`${b}/login`); } },
  { name: "login-nuvem", mode: "cloud", reach: async (p, b) => { await p.goto(`${b}/login`); } },
  { name: "reset-sem-link", mode: "lan", reach: async (p, b) => {
    await p.goto(`${b}/reset-password`);
    await p.getByText("Link inválido ou expirado.").waitFor();
  } },
  { name: "primeiro-acesso", mode: "lan", reach: async (p, b) => {
    await login(p, b, "novo@loja.dev");
    await p.getByRole("heading", { name: "Primeiro acesso" }).waitFor();
    await p.getByText("Primeiro acesso neste equipamento", { exact: true }).waitFor();
  } },
  { name: "painel-404-loja", mode: "lan", reach: async (p, b) => {
    await login(p, b, "admin@local.dev");
    await p.waitForURL(`${b}/`);
    await p.goto(`${b}/rota-inexistente`);
    await p.getByText("Oops! Page not found").waitFor();
  } },
  { name: "painel-seletor-nuvem", mode: "cloud", reach: async (p, b) => {
    await login(p, b, "admin@nuvem.dev");
    await p.getByText("Selecione onde trabalhar").waitFor();
  }, region: (p) => p.getByRole("dialog") },
];

async function capture(page: Page, scenario: Scenario): Promise<Buffer> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  const options = { animations: "disabled", caret: "hide" } as const;
  return scenario.region ? scenario.region(page).screenshot(options) : page.screenshot(options);
}

for (const scenario of scenarios) {
  test(scenario.name, async ({ browser }, testInfo) => {
    const shots: Buffer[] = [];
    for (const base of [APPS[scenario.mode].legacy, APPS[scenario.mode].next]) {
      const context = await browser.newContext(testInfo.project.use);
      const page = await context.newPage();
      await scenario.reach(page, base);
      shots.push(await capture(page, scenario));
      await context.close();
    }
    const ratio = diffRatio(`${scenario.name}-${testInfo.project.name}`, shots[0]!, shots[1]!);
    testInfo.annotations.push({ type: "diff-ratio", description: String(ratio) });
    expect(ratio, `diferença em ${scenario.name}; ver tests/visual/output`).toBeLessThanOrEqual(MAX_DIFF_RATIO);
  });
}
