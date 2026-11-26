import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';

/** Fails any test that logs a console error or throws an uncaught exception. */
const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(err.message));
      await use(errors);
      expect(errors, 'console errors').toEqual([]);
    },
    { auto: true },
  ],
});

const modules = [
  { hash: '#/intake', title: 'Rozcestník', question: 'Má to vůbec být AI?' },
  { hash: '#/pii', title: 'Ochrana dat', question: 'Co nesmí odejít do modelu?' },
  { hash: '#/agent', title: 'Agent pod kontrolou', question: 'Jak AI bezpečně jedná?' },
  { hash: '#/local', title: 'Lokálně', question: 'Co když data nesmí opustit zařízení?' },
];

test('landing shows the project gallery', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Bezpečná AI v praxi' })).toBeVisible();

  const cards = page.getByTestId('module-card');
  await expect(cards).toHaveCount(4);
  for (const [i, m] of modules.entries()) {
    await expect(cards.nth(i).getByRole('heading', { name: m.title })).toBeVisible();
    await expect(cards.nth(i).getByRole('link')).toHaveAttribute('href', m.hash);
  }
  await expect(page.getByRole('heading', { name: 'Upozornění' })).toBeVisible();
});

test('clicking a card opens the module', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Otevřít projekt Rozcestník' }).click();
  await expect(page).toHaveURL(/#\/intake$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Rozcestník' })).toBeVisible();
});

test('the header switches between projects from any page', async ({ page }) => {
  await page.goto('./#/pii');
  const tabs = page.getByRole('navigation', { name: 'Projekty' });
  await expect(tabs.getByRole('link')).toHaveCount(4);
  await expect(tabs.getByRole('link', { name: 'Ochrana dat' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await tabs.getByRole('link', { name: 'Agent pod kontrolou' }).click();
  await expect(page).toHaveURL(/#\/agent$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Agent pod kontrolou' })).toBeVisible();
  await page.getByRole('link', { name: 'Bezpečná AI v praxi: úvod' }).click();
  await expect(page.getByTestId('module-card')).toHaveCount(4);
});

test('the theme switch overrides the system and is remembered', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'light' });
  const page = await context.newPage();
  await page.goto('./#/pii');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'light');
  const toggle = page.getByRole('switch', { name: 'Tmavý režim' });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('switch', { name: 'Tmavý režim' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await context.close();
});

for (const m of modules) {
  test(`route ${m.hash} loads`, async ({ page }) => {
    await page.goto(`./${m.hash}`);
    await expect(page.getByRole('heading', { level: 1, name: m.title })).toBeVisible();
    await expect(page.getByText(m.question).first()).toBeVisible();
    await expect(page.getByText('Technické demo. Nejde o investiční')).toBeVisible();
    await expect(page).toHaveTitle(`${m.title} · Bezpečná AI v praxi`);
    await expect(
      page.getByRole('navigation', { name: 'Projekty' }).getByRole('link', { name: m.title }),
    ).toHaveAttribute('aria-current', 'page');
  });
}

test('hero scene: a click on the scene pauses it, reduced motion shows a still frame', async ({
  browser,
}) => {
  const running = (page: Page) =>
    page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity)
          .length,
    );

  const normal = await browser.newPage();
  await normal.goto('./');
  await expect.poll(() => running(normal)).toBeGreaterThan(0);
  await normal.getByRole('button', { name: 'Pozastavit animaci' }).click();
  await expect.poll(() => running(normal)).toBe(0);
  await normal.close();

  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const reduced = await context.newPage();
  await reduced.goto('./');
  await expect(reduced.getByRole('button', { name: 'Přehrát animaci' })).toBeVisible();
  expect(await running(reduced)).toBe(0);
  await context.close();
});

test('every route renders in the dark theme', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  for (const hash of ['', ...modules.map((m) => m.hash)]) {
    await page.goto(`./${hash}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  }
  expect(errors).toEqual([]);
  await context.close();
});

test('unknown route shows the not-found page', async ({ page }) => {
  await page.goto('./#/neexistuje');
  await expect(page.getByRole('heading', { level: 1, name: 'Stránka nenalezena' })).toBeVisible();
});

test('initial load does not download module chunks', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (req) => {
    if (req.resourceType() === 'script') scripts.push(new URL(req.url()).pathname);
  });
  await page.goto('./');
  await expect(page.getByTestId('module-card')).toHaveCount(4);
  expect(scripts.filter((s) => /(Intake|Pii|Agent|Local)Page/.test(s))).toEqual([]);
});

test('intake recommends from presets, links to the modules and exports an ADR without any network call', async ({
  page,
}) => {
  const external: string[] = [];
  page.on('request', (req) => {
    if (new URL(req.url()).hostname !== 'localhost') external.push(req.url());
  });
  await page.goto('./#/intake');

  const pattern = page.getByTestId('intake-pattern');
  const aiAct = page.getByTestId('intake-ai-act');
  await expect(pattern).toHaveText('AI nepotřebujete');

  await page.getByRole('button', { name: 'Automatické rozhodnutí o úvěru' }).click();
  await expect(pattern).toHaveText('Klasické strojové učení + člověk ve smyčce');
  await expect(aiAct).toContainText('Vysoce riziková');
  await expect(aiAct).toContainText('2. 12. 2027');

  await page.getByRole('button', { name: 'Emoce operátorů call centra' }).click();
  await expect(pattern).toHaveText('Nenasazovat');
  await expect(aiAct).toContainText('Zakázaná praktika');

  await page.getByRole('button', { name: 'Klientský chatbot' }).click();
  await expect(aiAct).toContainText('Povinnosti transparentnosti');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Stáhnout ADR (.md)' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^adr-klientsky-chatbot-\d{4}-\d{2}-\d{2}\.md$/);
  const adr = readFileSync(await download.path(), 'utf8');
  expect(adr.startsWith('# ADR: Klientský chatbot\n')).toBe(true);
  expect(adr).toContain('RAG (vyhledávání + jazykový model)');

  await page.getByTestId('intake-controls').getByRole('link', { name: '→ Ochrana dat' }).click();
  await expect(page).toHaveURL(/#\/pii$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Ochrana dat' })).toBeVisible();

  expect(external).toEqual([]);
});

test('pii module detects, pseudonymises and redacts in the browser without any network call', async ({
  page,
}) => {
  const external: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.hostname !== 'localhost' || /transformers|ort-wasm/.test(url.pathname)) {
      external.push(req.url());
    }
  });
  await page.goto('./#/pii');

  const findings = page.getByTestId('pii-findings');
  await expect(findings.getByText('791112/5013')).toBeVisible();
  await expect(page.getByTestId('pii-output')).toContainText('<OSOBA_1>');
  await expect(page.getByTestId('pii-output')).not.toContainText('791112/5013');

  await page.getByText('Začernění', { exact: true }).click();
  await expect(page.getByTestId('pii-output')).toContainText('[RODNÉ_ČÍSLO]');

  await page.getByRole('button', { name: 'Těžké případy' }).click();
  await expect(findings.getByText('Petr Nový')).toBeVisible();

  await expect(page.getByTestId('pii-flow-restored')).toContainText('Petr Nový');
  await expect(page.getByTestId('simulated-badge')).toContainText('ne výstup jazykového modelu');

  // The NER model and its runtime are loaded only after an explicit click.
  expect(external).toEqual([]);
});

test('pii eval table shows the numbers from evals/pii/results.json', async ({ page }) => {
  const results = JSON.parse(
    readFileSync(resolve(import.meta.dirname, '../../../evals/pii/results.json'), 'utf8'),
  ) as {
    configs: Record<string, { test: { micro: { strict: { f1: number } } } } | undefined>;
  };
  const percent = new Intl.NumberFormat('cs-CZ', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  await page.goto('./#/pii');
  await expect(page.getByTestId('synthetic-warning')).toContainText('nadhodnocují');

  const total = page.getByTestId('pii-eval-table').getByRole('row', { name: /Celkem/ });
  const config = results.configs['rules+ner'] ?? results.configs.rules!;
  await expect(total).toContainText(percent.format(config.test.micro.strict.f1));

  await page.getByLabel('Jen pravidla').check();
  await expect(total).toContainText(percent.format(results.configs.rules!.test.micro.strict.f1));
});

// Agent (module 3) --------------------------------------------------------------------------------

const RECORDINGS_DIR = resolve(import.meta.dirname, '../../../evals/agent/recordings');
const recordingFiles = existsSync(RECORDINGS_DIR)
  ? readdirSync(RECORDINGS_DIR).filter((f) => f.endsWith('.json'))
  : [];

test('agent page works offline: scenarios, rules and the BYOK panel without any network call', async ({
  page,
}) => {
  const external: string[] = [];
  page.on('request', (req) => {
    if (new URL(req.url()).hostname !== 'localhost') external.push(req.url());
  });
  await page.goto('./#/agent?scenario=s4-rodne-cislo');
  await expect(page.getByRole('radio', { name: /Rodné číslo v dotazu/ })).toBeChecked();
  await expect(page.getByText('785215/3650')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pravidla' })).toBeVisible();
  await expect(page.getByTestId('byok-panel')).toBeVisible();
  if (recordingFiles.length === 0) {
    await expect(page.getByTestId('agent-not-recorded')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Spustit', exact: true })).toBeDisabled();
  }
  expect(external).toEqual([]);
});

test('every recorded scenario replays to an answer without errors or network calls', async ({
  page,
}) => {
  test.skip(recordingFiles.length === 0, 'Nahrávky zatím chybí (pnpm record:agent).');
  test.setTimeout(120_000);
  const external: string[] = [];
  page.on('request', (req) => {
    if (new URL(req.url()).hostname !== 'localhost') external.push(req.url());
  });
  for (const file of recordingFiles) {
    const [scenario, mode] = file.replace(/\.json$/, '').split('.');
    await page.goto(`./#/agent?scenario=${scenario}${mode === 'off' ? '&guardrails=off' : ''}`);
    await expect(page.getByTestId('agent-provenance')).toBeVisible();
    await page.getByRole('button', { name: 'Spustit', exact: true }).click();
    const answer = page.getByTestId('agent-answer');
    const dialog = page.getByTestId('approval-dialog');
    // Approvals show the recorded decision; continue until the run ends.
    while (!(await answer.isVisible())) {
      if (await dialog.isVisible())
        await dialog.getByRole('button', { name: 'Pokračovat' }).click();
      await page.waitForTimeout(100);
    }
    await expect(page.getByTestId('agent-error')).toHaveCount(0);
    await expect(page.getByTestId('trace-panel').getByTestId('trace-event').first()).toBeVisible();
  }
  expect(external).toEqual([]);
});

test('BYOK sends the browser-access header only after the click and keeps the key out of storage', async ({
  page,
}) => {
  const apiRequests: { method: string; browserAccess: string | undefined }[] = [];
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
  };
  await page.route('https://api.anthropic.com/**', async (route) => {
    const request = route.request();
    apiRequests.push({
      method: request.method(),
      browserAccess: request.headers()['anthropic-dangerous-direct-browser-access'],
    });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    // Mocked API answer — a test fixture, not model output.
    return route.fulfill({
      status: 200,
      headers: { ...cors, 'content-type': 'application/json', 'request-id': 'req_e2e' },
      body: JSON.stringify({
        id: 'msg_e2e',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-5-5',
        content: [{ type: 'text', text: 'Testovací odpověď z podvrženého API.' }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 12, output_tokens: 7 },
      }),
    });
  });

  await page.goto('./#/agent');
  const panel = page.getByTestId('byok-panel');
  await panel.locator('summary').click();
  await panel.getByLabel('API klíč Anthropic').fill('test-key-not-real');
  expect(apiRequests).toEqual([]);

  await panel.getByRole('button', { name: 'Spustit s vlastním klíčem' }).click();
  await expect(page.getByTestId('agent-answer')).toContainText('Testovací odpověď');
  await expect(page.getByText('Živý běh s vaším klíčem')).toBeVisible();

  const post = apiRequests.find((r) => r.method === 'POST');
  expect(post?.browserAccess).toBe('true');
  const stored = await page.evaluate(() => ({
    local: localStorage.length,
    session: sessionStorage.length,
    href: location.href,
  }));
  expect(stored.local + stored.session).toBe(0);
  expect(stored.href).not.toContain('test-key');
  await expect(page.getByTestId('trace-panel')).not.toContainText('test-key');
});

/** Headless Chromium may or may not expose WebGPU; hiding it makes the fallback deterministic. */
const hideWebGpu = () =>
  Object.defineProperty(Navigator.prototype, 'gpu', { get: () => undefined, configurable: true });

test('local coach analyses the sample week in the browser and sends nothing after the choice', async ({
  page,
}) => {
  await page.addInitScript(hideWebGpu);
  await page.goto('./#/local');
  await expect(page.getByTestId('webgpu-unsupported')).toBeVisible();
  await page.waitForLoadState('networkidle');

  const after: string[] = [];
  page.on('request', (req) => after.push(req.url()));
  await page.getByRole('button', { name: /Celý týden/ }).click();

  await expect(page.getByTestId('metrics')).toContainText('5,4 km');
  await expect(page.getByTestId('route-map')).toBeVisible();
  await expect(page.getByTestId('privacy-status')).toContainText('Skryto');
  await expect(page.getByText('Týdenní zátěž')).toBeVisible();
  await expect(page.getByTestId('coach-input')).toContainText('Tento týden: 3 aktivity');
  await expect(page.getByTestId('coach-template')).toContainText('Za týden: 3 aktivity');
  await expect(page.getByTestId('network-after-file')).toHaveText('0');

  await page.getByRole('button', { name: /Intervaly FIT/ }).click();
  await expect(page.getByTestId('metrics')).toContainText('7,1 km');
  expect(after).toEqual([]);
});

test('local coach reads an uploaded GPX without any request and never loads the model unasked', async ({
  page,
}) => {
  await page.addInitScript(hideWebGpu);
  const requests: string[] = [];
  page.on('request', (req) => requests.push(new URL(req.url()).pathname));
  await page.goto('./#/local');
  await page.waitForLoadState('networkidle');
  const before = requests.length;

  await page
    .getByTestId('activity-file')
    .setInputFiles(resolve(import.meta.dirname, '../../../data/activities/vecerni-beh.gpx'));
  await expect(page.getByTestId('metrics')).toContainText('5,4 km');
  await expect(page.getByTestId('network-after-file')).toHaveText('0');

  expect(requests.slice(before)).toEqual([]);
  expect(requests.filter((p) => /llm\.worker|web-llm/.test(p))).toEqual([]);
});
