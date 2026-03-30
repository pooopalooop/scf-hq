export const SPORTS = ['nfl', 'nba', 'mlb']

export const SPORT_CONFIG = {
  nfl: { label: 'NFL', color: 'nfl', cap: 200, activeRoster: 16, minorsSlots: 10 },
  nba: { label: 'NBA', color: 'nba', cap: 200, activeRoster: 13, minorsSlots: 10 },
  mlb: { label: 'MLB', color: 'mlb', cap: 260, activeRoster: 25, minorsSlots: 30, draftedSlots: 5 },
}

export const FA_SCALE = {
  1: { 1: 1.00, 2: 0.80, 3: 0.67 },
  2: { 1: 1.25, 2: 1.00, 3: 0.83 },
  3: { 1: 1.50, 2: 1.20, 3: 1.00 },
}

export const RESIGN_FLAT = { 1: 2, 2: 3, 3: 4, 4: 5 }
export const RESIGN_PCT = { 1: 0.20, 2: 0.30, 3: 0.40, 4: 0.50 }

export const MLB_ROOKIE_OPTIONS = [
  { label: 'Option 1', years: [3, 6, 9] },
  { label: 'Option 2', years: [2, 4] },
  { label: 'Option 3', years: [1] },
]

export const ROOKIE_DRAFT_SCALE = {
  nfl: [
    { round: '1st (1-5)', salaries: [6, 7, 8, 9] },
    { round: '1st (6-10)', salaries: [4, 5, 6, 7] },
    { round: '2nd', salaries: [2, 3, 4] },
    { round: '3rd', salaries: [1, 2, 3] },
    { round: '4th/5th', salaries: [0, 1] },
  ],
  nba: [
    { round: '1st (1-5)', salaries: [6, 7, 8, 9] },
    { round: '1st (6-10)', salaries: [4, 5, 6, 7] },
    { round: '2nd', salaries: [2, 3, 4] },
    { round: '3rd', salaries: [1, 2, 3] },
    { round: '4th/5th', salaries: [0, 1] },
  ],
}

export const ELIGIBILITY_LIMITS = {
  nfl: { pass: 3500, rush: 800, rec: 800 },
  nba: { pts: 750, reb: 400, ast: 400 },
  mlb: { ab: 300, ip: 100 },
}

export const TEAMS = [
  { name: 'Boston', role: 'commissioner' },
  { name: 'Ft. Wayne', role: 'owner' },
  { name: 'Greenville', role: 'owner' },
  { name: 'Karmiel', role: 'owner' },
  { name: 'Las Vegas', role: 'owner' },
  { name: 'Lufkin', role: 'commissioner' },
  { name: 'Oklahoma City', role: 'owner' },
  { name: 'Pittsburgh', role: 'owner' },
  { name: 'San Diego', role: 'commissioner' },
  { name: 'Cleveland', role: 'owner' },
]

export function calcFaMinimum(currentSalary, currentYears, newYears) {
  return Math.ceil(currentSalary * FA_SCALE[currentYears][newYears] + 1)
}

export function calcResignSalary(currentSalary, years) {
  if (currentSalary < 10) return currentSalary + RESIGN_FLAT[years]
  return currentSalary + Math.ceil(currentSalary * RESIGN_PCT[years])
}
