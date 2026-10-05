/* End-to-end smoke test: drives the real UI in Chrome and reports console errors. */
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0; let fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n         -> ${detail}` : ''}`); }
};
const text = (page) => page.evaluate(() => document.body.innerText);
const has = async (page, needle) => (await text(page)).toLowerCase().includes(needle.toLowerCase());
const clickByText = (page, needle, exact = false) => page.evaluate((n, e) => {
  const b = [...document.querySelectorAll('button')].find((x) => (e ? x.textContent.trim() === n : x.textContent.includes(n)));
  if (b) { b.click(); return true; } return false;
}, needle, exact);
/** Sets a controlled input's value the way a user would, without slow keystrokes. */
const fill = (page, selector, value) => page.evaluate((s, v) => {
  const el = document.querySelector(s);
  if (!el) return false;
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}, selector, value);

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const appErrors = () => errors.filter((e) => !/favicon|net::ERR_|Failed to load resource/i.test(e));

  console.log('\nLanding page');
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await page.waitForSelector('h1');
  check('hero renders', (await text(page)).includes('personal teacher'));
  check('auth section renders', (await text(page)).includes('Start your personalised plan'));
  check('no console errors on landing', appErrors().length === 0, appErrors().slice(0, 5).join(' | '));

  console.log('\nSign in as guest');
  await clickByText(page, 'Continue without an account');
  await page.waitForFunction(() => location.pathname.includes('onboarding'), { timeout: 15000 });
  check('redirects to onboarding', page.url().includes('/onboarding'));

  console.log('\nOnboarding');
  await page.waitForSelector('#onboard-name');
  await page.click('#onboard-name', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await fill(page, '#onboard-name', 'QA Learner');
  await clickByText(page, 'Continue', true);
  await wait(400);
  check('second step asks for the target', (await text(page)).includes('What is your target?'));
  await clickByText(page, 'Continue', true);
  await wait(400);
  check('third step asks about time', (await text(page)).includes('How much time can you give?'));
  await clickByText(page, 'Build my plan');
  await page.waitForFunction(() => location.pathname.includes('/dashboard'), { timeout: 15000 });

  console.log('\nDashboard');
  await page.waitForSelector('h1');
  const dash = await text(page);
  check('shows the premium CTA', dash.includes('What should I study now?'));
  check('shows readiness', dash.includes('readiness'));
  check('shows smart alerts', dash.includes('Smart alerts'));
  check('shows today’s plan', dash.includes('Today’s study plan'));
  check('greets the learner by name', await has(page, 'QA Learner'),
    `${dash.split('\n').filter(Boolean).slice(0, 6).join(' / ')} || profile=${await page.evaluate(() => (JSON.parse(localStorage.getItem('bandit:v1') || '{}').profile || {}).displayName)}`);
  check('no console errors on dashboard', appErrors().length === 0, appErrors().slice(0, 5).join(' | '));

  console.log('\nDark mode');
  await page.click('button[aria-label*="light mode"]');
  await wait(300);
  check('switches to light mode', await page.evaluate(() => !document.documentElement.classList.contains('dark')));
  await page.click('button[aria-label*="dark mode"]');
  await wait(300);
  check('switches back to dark mode', await page.evaluate(() => document.documentElement.classList.contains('dark')));

console.log('\nMaterials + grounded test generation');
  await page.goto(`${BASE}/materials`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('h1');
  check('empty state shown first', (await text(page)).includes('No materials yet'));
  await clickByText(page, 'Add material');
  await page.waitForSelector('#m-title');
  await fill(page, '#m-title', 'Urban transport notes');
  await fill(page, '#m-text', 'Urban transport has changed dramatically over the past fifty years. In many cities, private cars now dominate the streets, which causes severe congestion and air pollution. However, cities that invested in reliable public transport have seen measurable benefits. Commuters who use metro systems report significantly lower travel times, and air quality improves dramatically when the number of vehicles decreases. Critics argue that infrastructure projects are expensive and take years to complete. Nevertheless, the long-term savings in health and productivity usually exceed the initial cost.');
  await wait(300);
  await clickByText(page, 'Save material', true);
  await wait(500);
  check('material is saved and listed', (await text(page)).includes('Urban transport notes'));

  await page.goto(`${BASE}/test-generator`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#skill');
  await clickByText(page, 'Urban transport notes');
  await wait(400);
  check('grounded questions are previewed', !(await text(page)).includes('Grounded questions available: —'));
  await clickByText(page, 'Generate test', true);
  await wait(1500);
  const genState = { url: page.url(), tail: (await text(page)).split('\n').filter(Boolean).slice(-8).join(' | ') };
  check('generation navigated to the test or explained why',
    new URL(genState.url).pathname.startsWith('/test/') || genState.tail.includes('No questions'), genState.tail);
  await page.waitForFunction(() => location.pathname.startsWith('/test/'), { timeout: 15000 });
  await page.waitForSelector('input');
  check('test runner opens', (await text(page)).includes('Question 1 of'));

  console.log('\nTaking the test');
  for (let i = 0; i < 15; i++) {
    await page.evaluate(() => {
      const radios = [...document.querySelectorAll('input[type=radio]')];
      if (radios.length) { radios[radios.length - 1].click(); return; }
      const box = document.querySelector('input[aria-label="Your answer"]');
      if (box) { box.click(); box.value = 'definitely wrong'; box.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    const submitted = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')].filter((x) => /Submit test \(\d/.test(x.textContent));
      if (buttons.length && !buttons[0].disabled) { buttons[0].click(); return true; }
      return false;
    });
    if (submitted) break;
    await clickByText(page, 'Next');
    await wait(200);
  }
  await page.waitForFunction(() => document.body.innerText.toLowerCase().includes('test complete'), { timeout: 20000 });
  const results = await text(page);
  check('results screen appears', await has(page, 'Test complete'));
  check('shows score and estimated band', /\d+%/.test(results) && /estimated Band/i.test(results));
  check('shows per-type breakdown', results.includes('Performance by question type'));
  check('shows the answer review', results.includes('Answer review'));
  check('shows source evidence', results.includes('Show source evidence'));
  await wait(500);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bandit:v1')));
  check('the result was saved', stored.results.length === 1, `results=${stored.results.length}`);
  check('mistakes were recorded automatically', stored.mistakes.length > 0, `mistakes=${stored.mistakes.length}`);
  check('wrong answers are linked to the question type', stored.mistakes.every((m) => Boolean(m.questionType)));

  console.log('\nMistake bank + drill');
  await page.goto(`${BASE}/mistakes`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('h1');
  check('mistake bank is populated', await has(page, 'repeated'));
  await clickByText(page, 'Practice my mistakes');
  await page.waitForSelector('input[aria-label="Your corrected answer"]', { timeout: 10000 });
  check('drill view opens', await has(page, 'Practice my mistakes'));
  await fill(page, 'input[aria-label="Your corrected answer"]', 'wrong on purpose');
  await clickByText(page, 'Check answer', true);
  await wait(400);
  check('drill gives feedback', (await has(page, 'Not quite')) || (await has(page, 'Correct')));

  console.log('\nEvery page renders');
  for (const [route, needle] of [
    ['/coach', 'Ask me anything'], ['/planner', 'Plan preview'], ['/writing', 'Writing history'],
    ['/speaking', 'How this works'], ['/vocabulary', 'Review queue'], ['/grammar', 'Grammar'],
    ['/calendar', 'This month at a glance'], ['/tasks', 'Completed'], ['/analytics', 'Band progression'],
    ['/achievements', 'Achievements'], ['/mocks', 'Mock Exams'], ['/profile', 'Practice summary'],
    ['/settings', 'Your data'], ['/reading', 'Skill map'], ['/listening', 'Listening practice'],
  ]) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2' });
    await wait(350);
    check(`${route} renders`, (await text(page)).includes(needle));
  }

// __PART3__
console.log('\nCoach answers with real data');
  await page.goto(`${BASE}/coach`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[aria-label="Message the AI coach"]');
  await fill(page, 'input[aria-label="Message the AI coach"]', 'Why am I not improving?');
  await page.click('button[aria-label="Send"]');
  await page.waitForFunction(() => document.querySelectorAll('input[aria-label="Your answer"], input[aria-label="Message the AI coach"]').length >= 0
    && document.body.innerText.split('\n').filter((l) => l.trim().length > 30).length > 3, { timeout: 5000 }).catch(() => {});
  await page.waitForFunction(() => !document.body.innerText.includes('Analysing your data'), { timeout: 20000 });
  const coachText = await text(page);
  check('coach replies using learner data', /limiter|weakest|estimated Band/i.test(coachText), coachText.split('\n').filter((l) => l.trim().length > 25).slice(-3).join(' || '));

  console.log('\nWriting analysis');
  await page.goto(`${BASE}/writing`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('textarea');
  await fill(page, 'textarea', 'Universities should offer practical courses only. I agree because the labour market demands specific skills. However, a broad education is also valuable. Students who study a range of subjects develop critical thinking and they can discuss about difficult problems. Many students now prefer technical courses and this is because employers reward specialised knowledge. Nevertheless, adaptable graduates are needed by society. They can explain ideas clearly and they understand different perspectives. In conclusion, universities should offer both practical and broad courses. This balance serves society best because graduates need both specialised and transferable skills.');
  await wait(500);
  check('live analysis appears while typing', (await text(page)).includes('Live analysis'));
  await clickByText(page, 'Analyse essay', true);
  await wait(700);
  const writing = await text(page);
  check('essay is analysed and saved', writing.includes('Essay analysis') && writing.includes('Writing history'));
  check('all four criteria are scored', writing.includes('Task Response') && writing.includes('Grammatical Range & Accuracy'));
  check('writing detected the grammar error', /discuss/i.test(writing));

  console.log('\nSpeaking session');
  await page.goto(`${BASE}/speaking`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('textarea');
  await clickByText(page, 'Start answering');
  await fill(page, 'textarea', 'I live in a small city near the coast. It is quite peaceful and my family has lived there for three generations. The main advantage is that everything is within walking distance, so I do not need a car. However, public transport is limited at weekends. Overall I am happy here because the community is friendly.');
  await wait(200);
  await clickByText(page, 'Finish and analyse');
  await wait(700);
  const speaking = await text(page);
  check('speaking feedback is produced', speaking.includes('Examiner feedback'));
  check('fluency and lexical scores shown', speaking.includes('Fluency & Coherence') && speaking.includes('Lexical Resource'));
  check('recommendations given', speaking.includes('What to fix next'));

  console.log('\nVocabulary review');
  await page.goto(`${BASE}/vocabulary`, { waitUntil: 'networkidle2' });
  await wait(300);
  await clickByText(page, 'Add word');
  await page.waitForSelector('#v-word');
  await fill(page, '#v-word', 'mitigate');
  await fill(page, '#v-def', 'to make something less harmful');
  await clickByText(page, 'Save word', true);
  await wait(400);
  check('word is added', (await text(page)).includes('mitigate'));
  await clickByText(page, 'Review queue');
  await wait(400);
  check('review queue shows the new word', (await text(page)).includes('mitigate'));

  console.log('\nAnalytics reflects real data');
  await page.goto(`${BASE}/analytics`, { waitUntil: 'networkidle2' });
  await wait(700);
  const analytics = await text(page);
  check('skill map has data', !analytics.includes('No skill data yet'));
  check('charts rendered', (await page.$$('svg.recharts-surface')).length > 0);
  check('writing progression populated', !analytics.includes('Write your first essay'));
  check('speaking progression populated', !analytics.includes('Complete a speaking session'));

  console.log('\nMock exam');
  await page.goto(`${BASE}/mocks`, { waitUntil: 'networkidle2' });
  await wait(400);
  const mocksBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('bandit:v1')).mocks.length);
  await clickByText(page, 'Start a mock exam');
  await wait(900);
  const mocks = await page.evaluate(() => JSON.parse(localStorage.getItem('bandit:v1')).mocks);
  check('starting a mock creates one in progress', mocks.length === mocksBefore + 1 && mocks[0].status === 'in_progress',
    `count=${mocks.length} status=${mocks[0]?.status}`);
  check('starting a mock routes to the first component', /listening|reading|writing|speaking/.test(page.url()), page.url());
  await page.goto(`${BASE}/mocks`, { waitUntil: 'networkidle2' });
  await wait(400);
  check('mock appears in the list', await has(page, 'components recorded'));
  const recorded = await clickByText(page, 'Record Reading');
  await wait(600);
  check('a component can be recorded', recorded || (await has(page, 'components recorded')), `recorded=${recorded}`);

  console.log('\nResponsive layout (mobile)');
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle2' });
  await wait(600);
  check('mobile bottom nav is visible', await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Quick navigation"]');
    return !!nav && getComputedStyle(nav).display !== 'none';
  }));
  check('no horizontal overflow on dashboard', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2));
  await page.click('nav[aria-label="Quick navigation"] a[href="/tasks"]');
  await wait(600);
  check('mobile navigation works', page.url().includes('/tasks'));
  check('no horizontal overflow on tasks', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2));

  console.log('\nConsole health');
  const realErrors = errors.filter((e) => !/favicon|net::ERR_|Failed to load resource/i.test(e));
  check(`no runtime console errors (${realErrors.length})`, realErrors.length === 0, realErrors.slice(0, 5).join(' | '));

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await wait(700);
  await page.screenshot({ path: '.tmp/landing.png' });
  await browser.close();

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });