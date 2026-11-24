const percent = new Intl.NumberFormat('cs-CZ', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const integer = new Intl.NumberFormat('cs-CZ');
const decimal = new Intl.NumberFormat('cs-CZ', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const megabytes = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'long', timeZone: 'UTC' });

/** 0.9554 → „95,5 %"; null (undefined metric, e.g. no predictions) → „—". */
export const formatPercent = (value: number | null) =>
  value === null ? '—' : percent.format(value);
export const formatInt = (value: number) => integer.format(value);
export const formatScore = (value: number) => decimal.format(value);
/** Decimal megabytes, as download sizes are usually shown. */
export const formatBytes = (bytes: number) => `${megabytes.format(bytes / 1_000_000)} MB`;
export const formatDate = (iso: string) => date.format(new Date(iso));
