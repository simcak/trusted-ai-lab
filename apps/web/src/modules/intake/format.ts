const integer = new Intl.NumberFormat('cs-CZ');
const money = new Intl.NumberFormat('cs-CZ', { maximumSignificantDigits: 2 });
const day = new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeZone: 'UTC' });

export const formatInt = (value: number) => integer.format(value);
/** Two significant digits: an estimate must not look more precise than it is. */
export const formatUsd = (value: number) => money.format(value);
/** „2027-12-02“ → „2. 12. 2027“. */
export const formatDay = (iso: string) => day.format(new Date(`${iso}T00:00:00Z`));
/** Today as an ISO date (UTC), for comparisons with AI Act milestones. */
export const todayIso = () => new Date().toISOString().slice(0, 10);
