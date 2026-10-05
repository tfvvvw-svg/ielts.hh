/* Verifies the Firebase config is live: initialises the SDK, checks auth
 * wiring and confirms the app boots into real (non-offline) mode. */
const puppeteer = require('puppeteer-core');

const BASE = process.env.BASE_URL ?? 'http://localhost:4193';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0; let fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n         -> ${detail}` : ''}`); }
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  const requests = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('response', (r) => {
    const u = r.url();
    if (/googleapis|firebase|firestore|identitytoolkit/.test(u)) requests.push(`${r.status()} ${u.slice(0, 110)}`);
  });

  console.log('\nFirebase config is compiled into the bundle');
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await page.waitForSelector('h1', { timeout: 20000 });
  const copy = await page.evaluate(() => document.body.innerText);
  check('landing renders with Firebase enabled', /Firebase Authentication/i.test(copy),
    copy.split('\n').filter((l) => /Firebase|offline|local/i.test(l)).join(' | '));
  check('offline-mode notice is gone', !/data stays on this browser/i.test(copy));
  check('config values are not exposed in page text',
    !copy.includes('AIzaSy') && !copy.includes('176152044019'));

  console.log('\nEmail sign-up with a real Firebase project');
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Create account')?.click());
  await page.waitForSelector('#name');
  const email = `bandit.qa.${Date.now()}@example.com`;
  const password = 'QaPassword123!';
  await page.evaluate((n, e, pw) => {
    const set = (sel, v) => {
      const el = document.querySelector(sel);
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('#name', n); set('#email', e); set('#password', pw);
  }, 'Firebase QA', email, password);
  await wait(300);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Create my account'))?.click());

  const signedIn = await page.waitForFunction(
    () => location.pathname.includes('/onboarding') || location.pathname.includes('/dashboard'),
    { timeout: 25000 },
  ).then(() => true).catch(() => false);
  check('email sign-up authenticates against Firebase', signedIn,
    errors.slice(0, 2).join(' | ') || `url=${page.url()}`);

  if (signedIn) {
    console.log('\nAuthenticated session');
    const auth = await page.evaluate(() => ({
      guest: localStorage.getItem('bandit:guest'),
      path: location.pathname,
    }));
    check('session is a real Firebase user, not the guest fallback', auth.guest === null, JSON.stringify(auth));
    check('new user is routed into onboarding', auth.path.includes('onboarding'), auth.path);

    console.log('\nUser data writes to Firestore');
    await page.evaluate(() => {
      const el = document.querySelector('#onboard-name');
      const proto = HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, 'Firebase Learner');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Continue')?.click());
    await wait(300);
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Continue')?.click());
    await wait(300);
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Build my plan'))?.click());
    await page.waitForFunction(() => location.pathname.includes('/dashboard'), { timeout: 15000 });
    check('onboarding completes for a Firebase user',
      (await page.evaluate(() => document.body.innerText)).toLowerCase().includes('firebase learner'));
    await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle2' });
    await wait(1200);
    const profileText = await page.evaluate(() => document.body.innerText);
    check('profile shows Firebase sync rather than offline mode', profileText.includes('Firebase sync'),
      `url=${page.url()} :: ${profileText.split('\n').filter((l) => l.trim()).slice(0, 8).join(' | ')}`);
  }

  console.log('\nNetwork + console health');
  check('app talked to Firebase identity/auth', requests.some((r) => /identitytoolkit|firebaseapp/.test(r)), requests.slice(0, 3).join(' | '));
  const appErrors = errors.filter((e) => !/favicon|net::ERR_|Failed to load resource/i.test(e));
  check(`no runtime console errors (${appErrors.length})`, appErrors.length === 0, appErrors.slice(0, 3).join(' | '));

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });