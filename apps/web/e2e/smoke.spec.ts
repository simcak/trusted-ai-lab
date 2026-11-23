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
