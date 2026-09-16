// Prints next week's posting slots (Tue, Wed, Thu at 9:30 AM New York) as UTC, DST-correct.
// Usage: node bin/slots.mjs [YYYY-MM-DD]   (defaults to today; "next week" is the week after it)
const ZONE = 'America/New_York';
const DAYS = [2, 3, 4]; // Tue, Wed, Thu
const HOUR = 9;
const MINUTE = 30;

function offsetMinutes(utcMs) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, timeZoneName: 'longOffset' })
    .formatToParts(new Date(utcMs))
    .find((p) => p.type === 'timeZoneName').value; // e.g. GMT-04:00
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

function nyToUtc(y, mo, d) {
  const guess = Date.UTC(y, mo, d, HOUR, MINUTE);
  return new Date(guess - offsetMinutes(guess) * 60000);
}

const base = process.argv[2] ? new Date(process.argv[2] + 'T12:00:00Z') : new Date();
const monday = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
monday.setUTCDate(monday.getUTCDate() + ((8 - monday.getUTCDay()) % 7 || 7)); // next Monday

for (const day of DAYS) {
  const d = new Date(monday);
  d.setUTCDate(monday.getUTCDate() + day - 1);
  const utc = nyToUtc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  console.log(`${d.toISOString().slice(0, 10)} ${utc.toISOString().replace('.000', '')}`);
}
