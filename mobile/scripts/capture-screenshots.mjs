import puppeteer from 'puppeteer-core';
import { mkdir } from 'fs/promises';

const BASE = 'http://127.0.0.1:43123';
const OUT = '/opt/cursor/artifacts/screenshots';

const onboardingPayload = JSON.stringify({
  language: 'spanish',
  scenario: {
    id: 'scenario_0',
    title: 'Coffee shop order',
    prompt: 'Practice ordering your favorite drink at a cozy café.',
    isCustom: false,
    icon: '☕',
    difficulty: 'easy',
  },
  proficiency: 'beginner',
  motivation: 'daily',
  plan: 'guest',
  completedAt: new Date().toISOString(),
});

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/usr/local/bin/google-chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream'],
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });

const clickText = async (text) => {
  await page.evaluate((t) => {
    const nodes = Array.from(document.querySelectorAll('div, span, p, button'));
    const el = nodes.find((n) => n.childNodes.length && n.textContent?.trim() === t);
    if (el) el.click();
  }, text);
  await new Promise((r) => setTimeout(r, 700));
};

// Fresh onboarding (welcome)
await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE}/onboarding`, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1600));
await page.screenshot({ path: `${OUT}/nobi-welcome.png` });

await clickText('Get started');
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `${OUT}/nobi-language.png` });

await clickText('Continue');
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `${OUT}/nobi-goals.png` });

await clickText('Continue');
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `${OUT}/nobi-account.png` });

await clickText('See plans');
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: `${OUT}/nobi-paywall.png` });

// Seed completed onboarding for home + session
await page.evaluate((data) => {
  localStorage.setItem('@nobi/onboarding', data);
  localStorage.setItem(
    '@nobi/profile',
    JSON.stringify({
      id: 'guest_demo',
      streak: 3,
      lastSessionDate: '2026-09-20',
      totalSessions: 5,
      xp: 120,
      displayName: 'You',
    }),
  );
}, onboardingPayload);

await page.goto(`${BASE}/home`, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1800));
await page.screenshot({ path: `${OUT}/nobi-home.png` });

await page.evaluate(() => {
  const nodes = Array.from(document.querySelectorAll('div, span, p'));
  const trophy = nodes.find((n) => n.textContent?.trim() === '🏆');
  trophy?.click();
});
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: `${OUT}/nobi-leaderboard.png` });

await page.goto(`${BASE}/session`, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 4000));
await page.screenshot({ path: `${OUT}/nobi-voice-session.png` });

console.log('Screenshots saved to', OUT);
await browser.close();
