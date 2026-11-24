import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test as base, expect } from '@playwright/test';

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
  { hash: '#/intake', title: 'Intake', question: 'Má to vůbec být AI?' },
  { hash: '#/pii', title: 'Ochrana dat', question: 'Co nesmí odejít do modelu?' },
  { hash: '#/agent', title: 'Agent pod kontrolou', question: 'Jak AI bezpečně jedná?' },
  { hash: '#/local', title: 'Lokálně', question: 'Co když data nesmí opustit zařízení?' },
];

test('landing shows four module cards in story order', async ({ page }) => {
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
  await page.getByRole('link', { name: 'Otevřít modul Intake' }).click();
  await expect(page).toHaveURL(/#\/intake$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Intake' })).toBeVisible();
});

for (const m of modules) {
  test(`route ${m.hash} loads`, async ({ page }) => {
    await page.goto(`./${m.hash}`);
    await expect(page.getByRole('heading', { level: 1, name: m.title })).toBeVisible();
    await expect(page.getByText(m.question).first()).toBeVisible();
    await expect(page.getByText('Technické demo. Nejde o investiční')).toBeVisible();
    await expect(page).toHaveTitle(`${m.title} · Bezpečná AI v praxi`);
  });
}

test('agent preview replays the fixture into the TracePanel and copies JSON', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./#/agent');

  await expect(page.getByTestId('fixture-badge')).toContainText('ne výstup modelu');
  await page.getByRole('button', { name: 'Přehrát ukázku' }).click();

  const panel = page.getByTestId('trace-panel');
  await expect(panel.getByTestId('trace-event')).toHaveCount(6);
  await expect(panel.getByText('Zamítnuto')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Přehrát ukázku' })).toBeEnabled();

  await panel.getByRole('button', { name: 'Zkopírovat trace jako JSON' }).click();
  await expect(panel.getByRole('status')).toHaveText('Trace je zkopírovaný do schránky.');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const parsed = JSON.parse(copied) as { type: string }[];
  expect(parsed.map((e) => e.type)).toEqual([
    'llm_call',
    'policy_decision',
    'tool_call',
    'llm_call',
    'policy_decision',
    'llm_call',
  ]);
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

  await page
    .getByTestId('intake-controls')
    .getByRole('link', { name: '→ Modul 2: Ochrana dat' })
    .click();
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
