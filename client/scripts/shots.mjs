#!/usr/bin/env node
/**
 * Bento screenshot sweep: every route × sm/md/lg (+ a 1366×768 laptop) × light/dark, plus named UI states (sheets,
 * modals), written to docs/screenshots/bento/. Also reports console errors and horizontal overflow per shot, which
 * is what "compare side by side with the .dc.html canvas" needs to be trustworthy.
 *
 * Needs the app running (Vite dev on :5173 proxying the API, or any base URL) with DEMO_MODE_ENABLED=true on the
 * server (`npm run seed:demo` for data). Logs in via POST /api/auth/demo-login and injects the session into
 * localStorage (api/client.ts setSession keys), rather than driving the login form.
 *
 *   node scripts/shots.mjs                      # everything
 *   node scripts/shots.mjs --routes /,/words    # some routes (and states on them)
 *   node scripts/shots.mjs --sizes lg --themes dark --no-states
 *   node scripts/shots.mjs --base http://localhost:4173 --out /tmp/shots --reduced-motion
 *
 * Uses playwright-core with the Chromium build it expects already in ~/.cache/ms-playwright (install one with
 * `npx playwright-core install chromium` if missing).
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);

const BASE = opt("base", "http://localhost:5173");
const API = opt("api", `${BASE}/api`);
const OUT = path.resolve(
  opt("out", path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "screenshots", "bento")),
);

// README §1.1 design frames, plus a common laptop to exercise the lg page-scroll fallback (< 820px tall).
const SIZES = {
  sm: { width: 390, height: 844 },
  md: { width: 834, height: 1194 },
  lg: { width: 1440, height: 900 },
  laptop: { width: 1366, height: 768 },
};
const ROUTES = ["/", "/words", "/plan", "/jobs", "/stats", "/notes", "/settings"];

/** Named states: a route plus the interaction that opens the state. Extend as each Phase 3 page lands. */
const STATES = [
  {
    name: "profile-sheet",
    route: "/",
    run: async (page) => {
      await page
        .getByRole("button", { name: /^Profile/ })
        .locator("visible=true")
        .first()
        .click();
      await page.waitForTimeout(450);
    },
  },
  {
    name: "add-stop",
    route: "/",
    run: async (page) => {
      await page.getByRole("button", { name: "Add task" }).click();
      await page.waitForTimeout(300);
    },
  },
  {
    name: "word-selected",
    route: "/words",
    run: async (page) => {
      // on sm this opens the bottom sheet; lg/md just move the selection
      await page.getByRole("option").nth(1).click();
      await page.waitForTimeout(450);
    },
  },
  {
    name: "word-details",
    route: "/words",
    run: async (page) => {
      await page.getByRole("option").first().click();
      await page.waitForTimeout(300);
      await page.getByRole("button", { name: "Word details" }).locator("visible=true").first().click();
      await page.waitForTimeout(350);
    },
  },
  {
    name: "add-word",
    route: "/words",
    run: async (page) => {
      await page.getByRole("button", { name: "Word", exact: true }).click();
      await page.getByPlaceholder(/Werkstatt/).locator("visible=true").fill("Genehmigung");
      await page.waitForTimeout(450);
    },
  },
  ...[
    ["plan-task", async (page) => page.getByRole("button", { name: /^Review: |^Grammar|^Vocabulary|^Reading|^Listening|^Speaking|^Writing/ }).first().click()],
    ["plan-station", async (page) => page.getByRole("button", { name: "Station overview" }).click()],
    ["plan-gate", async (page) => page.getByRole("button", { name: "See the gate" }).click()],
    ["plan-week", async (page) => page.getByRole("button", { name: "Open this week" }).click()],
    ["plan-library", async (page) => page.getByRole("button", { name: "See all" }).click()],
    ["plan-add-source", async (page) => page.getByRole("button", { name: "+ Add" }).click()],
  ].map(([name, open]) => ({
    name,
    route: "/plan",
    run: async (page) => {
      await open(page);
      await page.waitForTimeout(500);
    },
  })),
  {
    name: "jobs-detail",
    route: "/jobs",
    run: async (page) => {
      await page.getByRole("button", { name: /Open details$/ }).first().click();
      await page.waitForTimeout(600);
    },
  },
  {
    name: "jobs-new",
    route: "/jobs",
    run: async (page) => {
      await page.getByRole("button", { name: "New application" }).click();
      await page.waitForTimeout(400);
    },
  },
  {
    name: "notes-editor",
    route: "/notes",
    run: async (page) => {
      await page.getByRole("button", { name: /· / }).filter({ hasText: /Grammar|Mistakes|Everyday|Jobs|Listening/ }).first().click();
      await page.waitForTimeout(600);
    },
  },
  {
    name: "stats-drill",
    route: "/stats",
    run: async (page) => {
      await page.getByRole("button", { name: "Drill the shaky ones" }).click();
      await page.waitForTimeout(500);
    },
  },
];

const pick = (value, all) => (value ? value.split(",").filter((v) => all.includes(v)) : all);
const sizes = pick(opt("sizes"), Object.keys(SIZES));
const themes = pick(opt("themes"), ["light", "dark"]);
const routes = opt("routes") ? opt("routes").split(",") : ROUTES;
const states = flag("no-states") ? [] : STATES.filter((s) => routes.includes(s.route));

const slug = (route) => (route === "/" ? "today" : route.replace(/^\//, "").replace(/[/:]/g, "-"));

async function login() {
  const res = await fetch(`${API}/auth/demo-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`demo-login failed: ${res.status} (is DEMO_MODE_ENABLED=true on the server?)`);
  return res.json();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const session = await login();
  const browser = await chromium.launch();
  const problems = [];
  let count = 0;

  for (const theme of themes) {
    for (const size of sizes) {
      const context = await browser.newContext({
        viewport: SIZES[size],
        deviceScaleFactor: 1,
        colorScheme: theme,
        reducedMotion: flag("reduced-motion") ? "reduce" : "no-preference",
      });
      await context.addInitScript(
        ([s, t]) => {
          localStorage.setItem("token", s.token);
          localStorage.setItem("user", JSON.stringify(s.user));
          localStorage.setItem("isDemo", "1");
          localStorage.setItem("azubiweg-theme", t);
        },
        [session, theme],
      );

      const shoot = async (label, route, run) => {
        const page = await context.newPage();
        const errors = [];
        page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
        page.on("pageerror", (e) => errors.push(String(e)));
        await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        if (run) await run(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        const file = path.join(OUT, `${label}--${size}--${theme}.png`);
        await page.screenshot({ path: file, fullPage: true });
        count++;
        if (overflow > 0) problems.push(`${label} ${size} ${theme}: horizontal overflow ${overflow}px`);
        for (const e of errors) problems.push(`${label} ${size} ${theme}: console: ${e.slice(0, 200)}`);
        await page.close();
      };

      for (const route of routes) await shoot(slug(route), route);
      for (const s of states) await shoot(`${slug(s.route)}--${s.name}`, s.route, s.run);
      await context.close();
    }
  }

  await browser.close();
  console.log(`${count} screenshots → ${path.relative(process.cwd(), OUT) || OUT}`);
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    for (const p of problems) console.log(`  - ${p}`);
    process.exitCode = 1;
  } else {
    console.log("No console errors, no horizontal overflow.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
