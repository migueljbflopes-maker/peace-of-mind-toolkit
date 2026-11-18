import { expect, type Page } from "@playwright/test";

// Backlog F-06. How a visitor walks the one-time risk funnel (/riskfunnel),
// shared by e2e/risk-funnel.spec.ts and e2e/backend/risk-funnel.spec.ts.
//
// Everything here goes through what the visitor sees: headings, buttons by
// their visible name, the country list. Nothing reads the app's state.

export const FUNNEL_URL = "/riskfunnel";

export type Lang = "en" | "pt";

export interface Answers {
  /** Name as shown in the country list. The list is in English in both languages. */
  country: string;
  city: string;
  postalCode?: string;
  home: "apartment" | "house";
  /** Only asked for an apartment. "5+" is the top choice. */
  floor?: "0" | "1" | "2" | "3" | "4" | "5+";
  household: Array<"kids" | "elderly" | "medical" | "pets" | "alone">;
  experience: "multiple" | "once" | "never";
  kit: "yes" | "partly" | "no";
  water: boolean;
  power: boolean;
  contacts: boolean;
  plan: "yes" | "somewhat" | "no";
}

/** The funnel's visible texts, copied from the screens, per language. */
export const TEXT = {
  en: {
    continue: "Continue",
    seeResults: "See results",
    skip: "Skip",
    q1: "Where do you live?",
    q2: "Type of home?",
    q3: "Your household includes...",
    q4: "Have you been through a real emergency?",
    q6: "Do you have an emergency kit?",
    q7: "Do you have an evacuation plan?",
    selectCountry: "Select country",
    cityPlaceholder: "e.g., Lisbon",
    postalPlaceholder: "e.g., 1000-001",
    home: { apartment: "Apartment", house: "House" },
    ground: "Ground",
    household: { kids: "Kids", elderly: "Elderly", medical: "Medical needs", pets: "Pets", alone: "Living alone" },
    experience: { multiple: "Yes, multiple times", once: "Yes, once", never: "Never" },
    kit: { yes: "Yes", partly: "Partly", no: "No" },
    water: "Water for 3+ days",
    power: "Power backup",
    contacts: "Emergency contacts",
    plan: { yes: "Yes, everyone knows it", somewhat: "Somewhat", no: "We don't have one" },
    interstitial1: "Profile logged",
    interstitial2: "Readiness check complete",
    analyzing: "Analyzing your risk...",
    resultTitle: "Your risk profile is ready",
    riskCategory: "Risk Category",
    keyFactors: "Key factors:",
    level: { low: "Low", moderate: "Moderate", high: "High" },
    viewResults: "View Results & Get Ready",
    offerTitle: "Your personalized plan is ready",
    offerCta: "START NOW",
    checkoutError: "Error opening checkout",
  },
  pt: {
    continue: "Continuar",
    seeResults: "Ver resultados",
    skip: "Saltar",
    q1: "Onde vives?",
    q2: "Tipo de habitação?",
    q3: "O teu agregado inclui...",
    q4: "Já passaste por uma emergência real?",
    q6: "Tens um kit de emergência?",
    q7: "Tens um plano de evacuação?",
    selectCountry: "Selecionar país",
    cityPlaceholder: "Ex: Lisboa",
    postalPlaceholder: "Ex: 1000-001",
    home: { apartment: "Apartamento", house: "Moradia" },
    ground: "R/C",
    household: { kids: "Crianças", elderly: "Idosos", medical: "Necessidades médicas", pets: "Animais", alone: "Vivo sozinho" },
    experience: { multiple: "Sim, várias vezes", once: "Sim, uma vez", never: "Nunca" },
    kit: { yes: "Sim", partly: "Parcial", no: "Não" },
    water: "Água para 3+ dias",
    power: "Backup de energia",
    contacts: "Contactos de emergência",
    plan: { yes: "Sim, toda a família sabe", somewhat: "Mais ou menos", no: "Não temos" },
    interstitial1: "Perfil registado",
    interstitial2: "Verificação de prontidão completa",
    analyzing: "A analisar o teu risco...",
    resultTitle: "O teu perfil de risco está pronto",
    riskCategory: "Categoria de Risco",
    keyFactors: "Principais fatores:",
    level: { low: "Baixo", moderate: "Moderado", high: "Alto" },
    viewResults: "Ver Resultados & Preparar-se",
    offerTitle: "O teu plano personalizado está pronto",
    offerCta: "COMEÇAR AGORA",
    checkoutError: "Erro ao abrir checkout",
  },
} as const;

export const heading = (page: Page, name: string) => page.getByRole("heading", { name, exact: true });

/** The button that moves to the next step: "Continue", or "See results" on the last question. */
export const nextButton = (page: Page, lang: Lang = "en") =>
  page.getByRole("button", { name: new RegExp(`^(${TEXT[lang].continue}|${TEXT[lang].seeResults})$`) });

/** The switch on the row with this label. The switches themselves have no name. */
export const toggle = (page: Page, label: string) =>
  page.getByText(label, { exact: false }).locator("xpath=..").getByRole("switch");

async function setToggle(page: Page, label: string, on: boolean) {
  const control = toggle(page, label);
  if (((await control.getAttribute("aria-checked")) === "true") !== on) await control.click();
  await expect(control).toHaveAttribute("aria-checked", String(on));
}

// ── One question at a time ──────────────────────────────────────────────────

export async function answerLocation(page: Page, a: Answers, lang: Lang = "en") {
  const t = TEXT[lang];
  await expect(heading(page, t.q1)).toBeVisible();
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: a.country, exact: true }).click();
  await page.getByPlaceholder(t.cityPlaceholder).fill(a.city);
  if (a.postalCode) await page.getByPlaceholder(t.postalPlaceholder).fill(a.postalCode);
}

export async function answerHome(page: Page, a: Answers, lang: Lang = "en") {
  const t = TEXT[lang];
  await expect(heading(page, t.q2)).toBeVisible();
  await page.getByRole("button", { name: t.home[a.home] }).click();
  if (a.home === "apartment" && a.floor !== undefined) {
    const label = a.floor === "0" ? t.ground : a.floor;
    await page.getByRole("button", { name: label, exact: true }).click();
  }
}

export async function answerHousehold(page: Page, a: Answers, lang: Lang = "en") {
  const t = TEXT[lang];
  await expect(heading(page, t.q3)).toBeVisible();
  for (const tag of a.household) await page.getByRole("button", { name: t.household[tag] }).click();
}

export async function answerExperience(page: Page, a: Answers, lang: Lang = "en") {
  const t = TEXT[lang];
  await expect(heading(page, t.q4)).toBeVisible();
  await page.getByRole("button", { name: t.experience[a.experience] }).click();
}

export async function answerKit(page: Page, a: Answers, lang: Lang = "en") {
  const t = TEXT[lang];
  await expect(heading(page, t.q6)).toBeVisible();
  // The emoji is part of the button's name, so "No" is matched at its end.
  await page.getByRole("button", { name: new RegExp(`${t.kit[a.kit]}$`) }).click();
  await setToggle(page, t.water, a.water);
  await setToggle(page, t.power, a.power);
  await setToggle(page, t.contacts, a.contacts);
}

export async function answerPlan(page: Page, a: Answers, lang: Lang = "en") {
  const t = TEXT[lang];
  await expect(heading(page, t.q7)).toBeVisible();
  await page.getByRole("button", { name: t.plan[a.plan] }).click();
}

// ── The whole walk ──────────────────────────────────────────────────────────

export interface WalkOptions {
  lang?: Lang;
  /**
   * "wait" (default) lets the two "saving" screens and the analysing screen
   * run their course, as a visitor who just watches. "skip" presses "Skip" on
   * the first two; the analysing screen cannot be skipped.
   */
  interstitials?: "wait" | "skip";
}

/** Questions 1 to 4, up to and including "Continue" on question 4. */
export async function answerFirstHalf(page: Page, a: Answers, lang: Lang = "en") {
  await answerLocation(page, a, lang);
  await nextButton(page, lang).click();
  await answerHome(page, a, lang);
  await nextButton(page, lang).click();
  await answerHousehold(page, a, lang);
  await nextButton(page, lang).click();
  await answerExperience(page, a, lang);
  await nextButton(page, lang).click();
}

/**
 * Opens the funnel and answers every question, through the interstitials and
 * the analysing screen, until the result is on screen.
 */
export async function walkToResult(page: Page, a: Answers, options: WalkOptions = {}) {
  const lang = options.lang ?? "en";
  const t = TEXT[lang];
  const pass = async (title: string) => {
    await expect(heading(page, title)).toBeVisible();
    if (options.interstitials === "skip") await page.getByRole("button", { name: t.skip }).click();
  };

  await page.goto(FUNNEL_URL);
  await answerFirstHalf(page, a, lang);
  await pass(t.interstitial1);
  await answerKit(page, a, lang);
  await nextButton(page, lang).click();
  await answerPlan(page, a, lang);
  await nextButton(page, lang).click();
  await pass(t.interstitial2);

  // The analysing screen: about four seconds, names the city, no way to skip.
  await expect(heading(page, t.analyzing)).toBeVisible();
  await expect(page.getByText(a.city, { exact: true })).toBeVisible();

  await expect(heading(page, t.resultTitle)).toBeVisible({ timeout: 15_000 });
}

// ── Reading the result as the visitor reads it ──────────────────────────────

export interface ShownResult {
  /** The word under "Risk Category". */
  level: string;
  /** N in "Score: N/100". */
  score: number;
  /** What comes after "/" in "Score: N/100". */
  outOf: number;
  /** The "Key factors" lines, in order. */
  reasons: string[];
}

export async function readResult(page: Page, lang: Lang = "en"): Promise<ShownResult> {
  const t = TEXT[lang];
  const box = page.getByText(t.riskCategory, { exact: true }).locator("xpath=..");
  const lines = await box.locator("p").allInnerTexts();
  // lines: ["Risk Category", "<level>", "Score: N/100"]
  const score = /^Score: (\d+)\/(\d+)$/.exec(lines[2] ?? "");
  if (!score) throw new Error(`The result does not show a score: ${JSON.stringify(lines)}`);
  const reasons = await page
    .getByText(t.keyFactors, { exact: true })
    .locator("xpath=..")
    .getByRole("listitem")
    .allInnerTexts();
  return {
    level: lines[1],
    score: Number(score[1]),
    outOf: Number(score[2]),
    reasons: reasons.map((line) => line.replace(/^•\s*/, "").trim()),
  };
}

/** Every euro amount written in a piece of text, e.g. "€120 €49" gives [120, 49]. */
export function euroAmounts(text: string): number[] {
  return [...text.matchAll(/€\s?(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s?€/g)].map((m) =>
    Number((m[1] ?? m[2]).replace(",", ".")),
  );
}
