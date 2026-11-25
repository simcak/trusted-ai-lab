import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { cs } from '../../i18n/cs.ts';
import LocalPage from './LocalPage.tsx';

const renderPage = () =>
  render(
    <MemoryRouter>
      <LocalPage />
    </MemoryRouter>,
  );

describe('LocalPage', () => {
  it('analyses a sample, trims the privacy zone and shows what the model would get', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: cs.modules.local.title })).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(cs.local.pick.samples.run.title) }),
    );

    const metrics = await screen.findByTestId('metrics');
    expect(within(metrics).getByText('5,4 km')).toBeTruthy();
    expect(within(metrics).getByText('5:36')).toBeTruthy();
    expect(screen.getByTestId('privacy-status').textContent).toMatch(/^Skryto/);

    const input = screen.getByTestId('coach-input').textContent ?? '';
    expect(input).toContain('Vzdálenost: 5,4 km');
    expect(input).not.toMatch(/49\.2|16\.6|Večerní/);
  });

  it('falls back to the rule-based summary without WebGPU', async () => {
    renderPage();
    // jsdom has no navigator.gpu
    expect(await screen.findByTestId('webgpu-unsupported')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(cs.local.pick.samples.intervals.title) }),
    );
    const template = await screen.findByTestId('coach-template');
    expect(template.textContent).toContain('Nejvíc času');
  });

  it('turns the privacy zone off with the slider', async () => {
    renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(cs.local.pick.samples.ride.title) }),
    );
    await screen.findByTestId('metrics');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0' } });
    expect(screen.getByTestId('privacy-status').textContent).toBe(cs.local.privacy.off);
  });

  it('reports a file it cannot read', async () => {
    renderPage();
    const file = new File(['lat,lon\n50,14'], 'zaznam.csv', { type: 'text/csv' });
    fireEvent.change(screen.getByTestId('activity-file'), { target: { files: [file] } });
    expect((await screen.findByRole('alert')).textContent).toBe(
      cs.local.pick.errorFor('zaznam.csv', cs.local.pick.errors.unknown_format),
    );
  });
});
