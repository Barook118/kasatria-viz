/**
 * data.js — Google Sheets data fetching and parsing
 *
 * Strategy: The Google Sheet is published as CSV (File → Share → Publish to web → CSV).
 * We fetch that public URL directly — no API key required, no CORS issues.
 *
 * Expected CSV columns (must match the sheet exactly):
 *   Name, Photo, Age, Country, Interest, Net Worth
 */

// ---------------------------------------------------------------------------
// CONFIGURATION
// Set VITE_SHEET_CSV_URL in your .env file.
// ---------------------------------------------------------------------------
const SHEET_CSV_URL = import.meta.env.VITE_SHEET_CSV_URL;

/**
 * Fetches and parses the Google Sheet CSV into an array of person objects.
 *
 * @returns {Promise<Person[]>}
 *
 * @typedef {Object} Person
 * @property {string} name
 * @property {string} photo      - full URL to profile photo
 * @property {number} age
 * @property {string} country    - 2-letter country code (CN, MY, IN, US…)
 * @property {string} interest
 * @property {number} netWorth   - numeric USD value (e.g. 251260.80)
 * @property {string} netWorthRaw - original string e.g. "$251,260.80"
 * @property {'red'|'orange'|'green'} colorClass - derived from netWorth
 */
export async function fetchPeople() {
  if (!SHEET_CSV_URL) {
    throw new Error(
      'VITE_SHEET_CSV_URL is not set. ' +
      'Copy .env.example to .env and fill in the published CSV URL.'
    );
  }

  const response = await fetch(SHEET_CSV_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  return parseCSV(text);
}

// ---------------------------------------------------------------------------
// CSV PARSER
// Handles quoted fields (including commas inside quotes, e.g. "$1,234.00").
// ---------------------------------------------------------------------------

/**
 * Parses a raw CSV string into an array of Person objects.
 * Skips the header row and any blank rows.
 *
 * @param {string} csvText
 * @returns {Person[]}
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/);

  // First row = headers; normalise them (trim + lowercase)
  const headers = splitCSVRow(lines[0]).map(h => h.trim().toLowerCase());

  const people = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // skip blank lines

    const values = splitCSVRow(line);

    // Build raw object keyed by normalised header
    const raw = {};
    headers.forEach((header, idx) => {
      raw[header] = (values[idx] ?? '').trim();
    });

    // Map to typed Person object
    const netWorthRaw = raw['net worth'] ?? raw[' net worth'] ?? '';
    const netWorth    = parseNetWorth(netWorthRaw);

    people.push({
      name:        raw['name']    || `Person ${i}`,
      photo:       raw['photo']   || '',
      age:         parseInt(raw['age'], 10) || 0,
      country:     raw['country'] || '',
      interest:    raw['interest'] || '',
      netWorthRaw,
      netWorth,
      colorClass:  netWorthColor(netWorth),
    });
  }

  return people;
}

/**
 * Splits a single CSV row into an array of fields,
 * correctly handling double-quoted fields that may contain commas.
 *
 * @param {string} row
 * @returns {string[]}
 */
function splitCSVRow(row) {
  const fields = [];
  let current  = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];

    if (ch === '"') {
      // Toggle quote mode; handle escaped double-quotes ("")
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  fields.push(current); // last field
  return fields;
}

/**
 * Converts a net-worth string like "$251,260.80" to a plain number.
 *
 * @param {string} str
 * @returns {number}
 */
function parseNetWorth(str) {
  // Remove $, commas, and any stray whitespace/special chars
  const cleaned = str.replace(/[$,\s\u00a0]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Returns the CSS color class for a tile based on net worth.
 *
 * Rules from the assignment:
 *   Red    — net worth < $100,000
 *   Orange — net worth > $100,000 (and ≤ $200,000)
 *   Green  — net worth > $200,000
 *
 * @param {number} worth
 * @returns {'red'|'orange'|'green'}
 */
function netWorthColor(worth) {
  if (worth > 200_000) return 'green';
  if (worth > 100_000) return 'orange';
  return 'red';
}
