import puppeteer from 'puppeteer-core';
import { mkdir } from 'fs/promises';

const BASE = 'http://127.0.0.1:43123';
const OUT = '/cursor/stores/self/media';

const onboardingPayload = JSON.stringify({
  language: 'spanish',
  scenario: {
    id: 'scenario_0',
    title: 'Coffee shop order',
    prompt: 'Practice ordering your favorite drink at a cozy café.',
    isCustom: false,
  },
  completedAt: new Date().toISOString(),
});

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/usr/local/bin/google-chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });

await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
await page.evaluate((data) => {
  localStorage.setItem('@nobi/onboarding', data);
  localStorage.setItem(
    '@nobi/profile',
    JSON.stringify({ id: 'guest_demo', streak: 3, lastSessionDate: '2026-09-20', totalSessions: 5 }),
  );
}, onboardingPayload);

await page.goto(`${BASE}/onboarding`, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: `${OUT}/nobi-onboarding.png` });

await page.goto(`${BASE}/home`, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: `${OUT}/nobi-home.png` });

await page.goto(`${BASE}/session`, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({ path: `${OUT}/nobi-voice-session.png` });

console.log('Screenshots saved to', OUT);
await browser.close();
