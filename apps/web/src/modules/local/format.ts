const one = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 1 });
const oneFixed = new Intl.NumberFormat('cs-CZ', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const twoFixed = new Intl.NumberFormat('cs-CZ', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const integer = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 });

export const formatInt = (n: number) => integer.format(n);
export const formatDecimal = (n: number) => one.format(n);
export const formatRatio = (n: number) => twoFixed.format(n);

/** 5432 → „5,4 km"; 380 → „380 m". */
export function formatDistance(meters: number): string {
  return meters < 1000 ? `${integer.format(meters)} m` : `${oneFixed.format(meters / 1000)} km`;
}

/** 1860 s → „31 min"; 3930 s → „1 h 05 min". */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}

/** Decimal units, as download sizes are usually shown: „0,98 GB", „352 MB", „0,4 kB". */
export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${twoFixed.format(bytes / 1e9)} GB`;
  if (bytes >= 1e6) return `${integer.format(bytes / 1e6)} MB`;
  return `${one.format(bytes / 1e3)} kB`;
}
