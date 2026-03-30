#!/usr/bin/env node
/**
 * import-rosters.js
 * Fetches all 10 SCF team roster sheets from Google Sheets CSV export,
 * parses every player, contract, and cap total, then inserts into Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv dependency)
const envPath = resolve(__dirname, '..', 'server', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^(\w+)=(.+)$/);
  if (match) env[match[1]] = match[2].trim();
}

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SHEET_ID = '1GFxHIj4GoHOmw7B9Sq8WsEaEKa1-Gyyc8CkH76HFVME';
const TEAMS = [
  'Boston', 'Ft. Wayne', 'Greenville', 'Lufkin', 'Las Vegas',
  'Oklahoma City', 'Pittsburgh', 'San Diego', 'Karmiel', 'Cleveland'
];

const CAP_TOTALS = { nfl: 200, nba: 200, mlb: 260 };

// ── CSV parser (handles quoted fields with commas inside) ──
function parseCSV(text) {
  const rows = [];
  let current = '';
  let inQuote = false;
  const chars = text.split('');

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === '"') {
      if (inQuote && chars[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === ',' && !inQuote) {
      rows.length === 0 ? rows.push([current]) : rows[rows.length - 1].push(current);
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuote) {
      if (ch === '\r' && chars[i + 1] === '\n') i++;
      if (rows.length === 0) {
        rows.push([current]);
      } else {
        rows[rows.length - 1].push(current);
      }
      current = '';
      rows.push([]);
    } else {
      current += ch;
    }
  }
  // push last field
  if (rows.length === 0) rows.push([]);
  rows[rows.length - 1].push(current);
  // remove trailing empty row
  if (rows.length && rows[rows.length - 1].every(c => c === '')) rows.pop();
  return rows;
}

// ── Fetch CSV from Google Sheets ──
async function fetchSheet(teamName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(teamName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${teamName}: ${res.status}`);
  const text = await res.text();
  return parseCSV(text);
}

// ── Clean a salary value: strip $, *, commas, parse to int ──
function parseSalary(val) {
  if (!val || val === '') return null;
  const cleaned = val.replace(/[$,*]/g, '').trim();
  // skip non-numeric like "UFA", "RFA"
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned));
}

// ── Clean player name: remove *, parenthetical contract info, trailing whitespace ──
function cleanName(raw) {
  if (!raw) return null;
  let name = raw.trim();
  // Remove trailing * (rookie marker - we track separately)
  // Remove parenthetical info like (7-8-9), (16-16-16), (1-UFA), etc.
  name = name.replace(/\s*\([^)]*\)\s*/g, '').trim();
  // Remove trailing *
  name = name.replace(/\*+$/, '').trim();
  // Remove leading/trailing whitespace and dots
  name = name.replace(/^[.\s]+|[.\s]+$/g, '').trim();
  // Remove trailing " -" artifacts
  name = name.replace(/\s*-\s*$/, '').trim();
  if (!name || name.length < 2) return null;
  return name;
}

function isRookie(raw) {
  return raw && raw.includes('*');
}

// ── Determine slot status from column 0 value ──
function getStatus(slot) {
  if (!slot) return null;
  const s = slot.trim();
  if (/^\d+\)$/.test(s)) return 'active';
  if (/^DL$/i.test(s)) return 'dl';
  if (/^IR$/i.test(s)) return 'ir';
  return null;
}

// ── Parse one sport section from a row ──
// Returns array of player objects (usually 1, but DL rows can have multiple via /)
function parseRosterEntry(row, sportOffset, sport) {
  const slotCol = sportOffset;
  const nameCol = sportOffset + 1;
  const posCol = sportOffset + 2;
  const salaryCol = sportOffset + 3;
  const yr1Col = sportOffset + 4;
  const yr2Col = sportOffset + 5;
  const yr3Col = sportOffset + 6;

  const slot = (row[slotCol] || '').trim();
  const rawName = (row[nameCol] || '').trim();
  const rawPos = (row[posCol] || '').trim();
  const rawSalary = (row[salaryCol] || '').trim();
  const rawYr1 = (row[yr1Col] || '').trim();
  const rawYr2 = (row[yr2Col] || '').trim();
  const rawYr3 = (row[yr3Col] || '').trim();

  // Check for special rows
  if (slot.startsWith('Extra/ sspd')) return [{ _special: 'sspd' }];
  if (slot.startsWith('Extra/ trades')) return [{ _special: 'trades' }];
  if (slot.startsWith('Extra/ 1 yr') || slot.startsWith('Extra/ 2 yr') || slot.startsWith('Extra/ 3 yr')) return [{ _special: 'releases' }];
  if (slot.startsWith('Extra/ minors')) return [{ _special: 'extra_minors' }];
  if (slot.startsWith('Extra/ luxury')) return [{ _special: 'luxury' }];
  if (slot === 'Total') return [{ _special: 'total', salary: parseSalary(rawSalary) }];

  const status = getStatus(slot);
  if (!status) return [];
  if (!rawName) return [];

  // Handle multi-player DL/IR rows (separated by " / ")
  if ((status === 'dl' || status === 'ir') && rawName.includes(' / ')) {
    const names = rawName.split(' / ');
    const positions = rawPos.split(' / ');
    // For multi-player DL, salary is often a total for all.
    // We need to try to split it. Often, parenthetical info has individual salaries.
    // Simple approach: if there's a salary, try to parse each name's parenthetical.
    const results = [];
    for (let i = 0; i < names.length; i++) {
      const n = names[i].trim();
      if (!n) continue;
      const cleaned = cleanName(n);
      if (!cleaned) continue;

      // Try to extract salary from parenthetical in the name
      const parenMatch = n.match(/\(([^)]+)\)/);
      let playerSalary = null;
      let playerYr1 = null;
      let playerYr2 = null;
      let playerYr3 = null;
      if (parenMatch) {
        const parts = parenMatch[1].split('-').map(p => p.trim());
        playerSalary = parseSalary(parts[0]);
        playerYr1 = parts[1] ? parseSalary(parts[1]) : null;
        playerYr2 = parts[2] ? parseSalary(parts[2]) : null;
        playerYr3 = parts[3] ? parseSalary(parts[3]) : null;
      }

      // If no parenthetical salary and this is the first (or only with salary column)
      if (playerSalary === null && i === 0 && names.length > 1) {
        // The salary column might be a total; just use it for the first player if no paren info
        // Actually, for multi-player rows, if no paren info, each likely has individual salary 0 (minors-type)
        playerSalary = parseSalary(rawSalary);
      } else if (playerSalary === null && names.length === 1) {
        playerSalary = parseSalary(rawSalary);
      }

      results.push({
        name: cleaned,
        position: (positions[i] || positions[0] || '').trim(),
        salary: playerSalary || 0,
        year1: playerYr1,
        year2: playerYr2,
        year3: playerYr3,
        status,
        rookie: isRookie(n),
        sport,
      });
    }
    // If all had parenthetical info, good. But we also have a salary column total.
    // If the salary column has a value and there were no parentheticals, split evenly?
    // Actually, let's use the salary column directly for multi-player rows if we couldn't parse parens.
    if (results.length > 0 && results.every(r => r.salary === 0) && parseSalary(rawSalary) > 0) {
      // Fallback: assign full salary to first player
      results[0].salary = parseSalary(rawSalary) || 0;
    }
    return results;
  }

  // Single player row
  const name = cleanName(rawName);
  if (!name) return [];

  // Check for parenthetical contract info in the name
  const parenMatch = rawName.match(/\(([^)]+)\)/);
  let salary = parseSalary(rawSalary);
  let year1 = parseSalary(rawYr1);
  let year2 = parseSalary(rawYr2);
  let year3 = parseSalary(rawYr3);

  // If the name has parenthetical contract like "(7-8-9)" and no salary column,
  // use parens for future years. The salary column IS the current year.
  // Actually the salary col is always current year. Parens are just notes.

  return [{
    name,
    position: rawPos.trim() || null,
    salary: salary || 0,
    year1,
    year2,
    year3,
    status,
    rookie: isRookie(rawName),
    sport,
  }];
}

// ── Parse minors section ──
function parseMinorsSection(rows, startRow, sportOffset, sport) {
  const players = [];
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    const slot = (row[sportOffset] || '').trim();
    const rawName = (row[sportOffset + 1] || '').trim();
    const rawPos = (row[sportOffset + 2] || '').trim();
    const rawSalary = (row[sportOffset + 3] || '').trim();
    const rawYr1 = (row[sportOffset + 4] || '').trim();
    const rawYr2 = (row[sportOffset + 5] || '').trim();
    const rawYr3 = (row[sportOffset + 6] || '').trim();

    // Stop at "Signing Bonuses Used", "Draft Picks", or empty numbered slots
    if (slot.startsWith('Signing Bonuses')) break;
    if (slot.includes('Draft Picks')) break;
    if (slot === '' && !rawName) continue;

    if (/^\d+\)$/.test(slot) && rawName) {
      const name = cleanName(rawName);
      if (!name) continue;
      players.push({
        name,
        position: rawPos.trim() || null,
        salary: parseSalary(rawSalary) || 0,
        year1: parseSalary(rawYr1),
        year2: parseSalary(rawYr2),
        year3: parseSalary(rawYr3),
        status: 'minors',
        rookie: isRookie(rawName),
        sport,
      });
    }
  }
  return players;
}

// ── Parse drafted players section (MLB only usually) ──
function parseDraftedSection(rows, startRow, sportOffset, sport) {
  const players = [];
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    const slot = (row[sportOffset] || '').trim();
    const rawName = (row[sportOffset + 1] || '').trim();
    const rawPos = (row[sportOffset + 2] || '').trim();
    const rawSalary = (row[sportOffset + 3] || '').trim();

    if (slot.startsWith('Signing Bonuses')) break;
    if (slot.includes('Draft Picks')) break;
    if (slot === '' && !rawName) continue;

    if (/^\d+\)$/.test(slot) && rawName) {
      const name = cleanName(rawName);
      if (!name) continue;
      players.push({
        name,
        position: rawPos.trim() || null,
        salary: parseSalary(rawSalary) || 0,
        year1: null,
        year2: null,
        year3: null,
        status: 'drafted',
        rookie: isRookie(rawName),
        sport,
      });
    }
  }
  return players;
}

// ── Main parse function for one team sheet ──
function parseTeamSheet(rows, teamName) {
  const result = {
    nfl: { players: [], totalSpent: 0 },
    nba: { players: [], totalSpent: 0 },
    mlb: { players: [], totalSpent: 0 },
  };

  // Sport offsets (column indices)
  const sports = [
    { key: 'nfl', offset: 0 },
    { key: 'nba', offset: 7 },
    { key: 'mlb', offset: 14 },
  ];

  // Phase 1: Parse main roster rows (skip header row 0)
  let nflTotalRow = -1;
  let nbaTotalRow = -1;
  let mlbTotalRow = -1;
  const sportTotalFound = { nfl: false, nba: false, mlb: false };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 7) continue;

    for (const { key, offset } of sports) {
      if (sportTotalFound[key]) continue;

      const entries = parseRosterEntry(row, offset, key);
      for (const entry of entries) {
        if (entry._special === 'total') {
          result[key].totalSpent = entry.salary || 0;
          sportTotalFound[key] = true;
          if (key === 'nfl') nflTotalRow = i;
          if (key === 'nba') nbaTotalRow = i;
          if (key === 'mlb') mlbTotalRow = i;
        } else if (!entry._special && entry.name) {
          result[key].players.push(entry);
        }
      }
    }
  }

  // Phase 2: Find and parse Minors sections
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    // NFL Minors
    const col0 = (row[0] || '').trim();
    if (col0 === 'Football Minors') {
      const minors = parseMinorsSection(rows, i + 1, 0, 'nfl');
      result.nfl.players.push(...minors);
    }

    // NBA Minors
    const col7 = (row[7] || '').trim();
    if (col7 === 'Basketball Minors') {
      const minors = parseMinorsSection(rows, i + 1, 7, 'nba');
      result.nba.players.push(...minors);
    }

    // MLB Minors
    const col14 = (row[14] || '').trim();
    if (col14 === 'Baseball Minors') {
      const minors = parseMinorsSection(rows, i + 1, 14, 'mlb');
      result.mlb.players.push(...minors);
    }

    // MLB Drafted Players
    if (col14 === 'Drafted Players List') {
      const drafted = parseDraftedSection(rows, i + 1, 14, 'mlb');
      result.mlb.players.push(...drafted);
    }
  }

  return result;
}

// ── Insert into Supabase ──
async function importTeam(teamName, teamId, data) {
  let totalPlayers = 0;
  let totalContracts = 0;

  for (const sport of ['nfl', 'nba', 'mlb']) {
    const sportData = data[sport];
    const players = sportData.players;

    for (const p of players) {
      // Insert player
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert({
          name: p.name,
          position: p.position,
          sport,
        })
        .select('id')
        .single();

      if (playerError) {
        console.error(`  Error inserting player ${p.name} (${sport}):`, playerError.message);
        continue;
      }

      totalPlayers++;

      // Insert contract
      const { error: contractError } = await supabase
        .from('contracts')
        .insert({
          player_id: playerData.id,
          team_id: teamId,
          sport,
          salary: p.salary,
          year1: p.year1,
          year2: p.year2,
          year3: p.year3,
          status: p.status,
          rookie_contract: p.rookie || false,
        });

      if (contractError) {
        console.error(`  Error inserting contract for ${p.name}:`, contractError.message);
        continue;
      }

      totalContracts++;

      // If minors/drafted, also insert into minors_roster
      if (p.status === 'minors' || p.status === 'drafted') {
        const { error: minorsError } = await supabase
          .from('minors_roster')
          .insert({
            player_id: playerData.id,
            team_id: teamId,
            sport,
            list_type: p.status === 'drafted' ? 'drafted' : 'minors',
          });
        if (minorsError) {
          console.error(`  Error inserting minors_roster for ${p.name}:`, minorsError.message);
        }
      }
    }

    // Update cap_state
    const { error: capError } = await supabase
      .from('cap_state')
      .update({
        spent: sportData.totalSpent,
        total_cap: CAP_TOTALS[sport],
      })
      .eq('team_id', teamId)
      .eq('sport', sport);

    if (capError) {
      console.error(`  Error updating cap_state for ${teamName} ${sport}:`, capError.message);
    }
  }

  return { totalPlayers, totalContracts };
}

// ── Main ──
async function main() {
  console.log('SCF/HQ Roster Import');
  console.log('====================\n');

  // Fetch team IDs
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name');

  if (teamsError) {
    console.error('Failed to fetch teams:', teamsError.message);
    process.exit(1);
  }

  const teamMap = {};
  for (const t of teams) {
    teamMap[t.name] = t.id;
  }

  // Clear existing data first
  console.log('Clearing existing contracts, players, minors_roster...');
  await supabase.from('minors_roster').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('contracts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared.\n');

  let grandTotalPlayers = 0;
  let grandTotalContracts = 0;

  for (const teamName of TEAMS) {
    const teamId = teamMap[teamName];
    if (!teamId) {
      console.error(`Team "${teamName}" not found in database!`);
      continue;
    }

    console.log(`Fetching ${teamName}...`);
    const rows = await fetchSheet(teamName);
    console.log(`  Parsed ${rows.length} rows`);

    const data = parseTeamSheet(rows, teamName);

    const nflCount = data.nfl.players.length;
    const nbaCount = data.nba.players.length;
    const mlbCount = data.mlb.players.length;
    console.log(`  NFL: ${nflCount} players (cap spent: ${data.nfl.totalSpent})`);
    console.log(`  NBA: ${nbaCount} players (cap spent: ${data.nba.totalSpent})`);
    console.log(`  MLB: ${mlbCount} players (cap spent: ${data.mlb.totalSpent})`);

    const { totalPlayers, totalContracts } = await importTeam(teamName, teamId, data);
    console.log(`  Inserted ${totalPlayers} players, ${totalContracts} contracts\n`);

    grandTotalPlayers += totalPlayers;
    grandTotalContracts += totalContracts;
  }

  console.log('==================');
  console.log(`DONE: ${grandTotalPlayers} players, ${grandTotalContracts} contracts across ${TEAMS.length} teams`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
