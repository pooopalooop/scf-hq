// Demo data for development without Supabase
// Matches the schema and design of the real app

export const DEMO_CAP_STATES = [
  { id: '1', team_id: 'demo-team-id', sport: 'nfl', season: 2025, total_cap: 200, spent: 157, teams: { name: 'Dallas' } },
  { id: '2', team_id: 'demo-team-id', sport: 'nba', season: 2025, total_cap: 200, spent: 134, teams: { name: 'Dallas' } },
  { id: '3', team_id: 'demo-team-id', sport: 'mlb', season: 2025, total_cap: 260, spent: 198, teams: { name: 'Dallas' } },
]

export const DEMO_CONTRACTS = [
  // NFL
  { id: 'n1', player_id: 'p1', team_id: 'demo-team-id', sport: 'nfl', salary: 42, year2: 42, year3: null, year4: null, status: 'active', players: { name: 'Josh Allen', position: 'QB' } },
  { id: 'n2', player_id: 'p2', team_id: 'demo-team-id', sport: 'nfl', salary: 28, year2: 28, year3: 28, year4: null, status: 'active', players: { name: 'Ja\'Marr Chase', position: 'WR' } },
  { id: 'n3', player_id: 'p3', team_id: 'demo-team-id', sport: 'nfl', salary: 22, year2: null, year3: null, year4: null, status: 'active', players: { name: 'Saquon Barkley', position: 'RB' } },
  { id: 'n4', player_id: 'p4', team_id: 'demo-team-id', sport: 'nfl', salary: 18, year2: 18, year3: null, year4: null, status: 'active', players: { name: 'Tee Higgins', position: 'WR' } },
  { id: 'n5', player_id: 'p5', team_id: 'demo-team-id', sport: 'nfl', salary: 14, year2: null, year3: null, year4: null, status: 'active', players: { name: 'George Kittle', position: 'TE' } },
  { id: 'n6', player_id: 'p6', team_id: 'demo-team-id', sport: 'nfl', salary: 12, year2: 12, year3: null, year4: null, status: 'active', players: { name: 'Sauce Gardner', position: 'CB' } },
  { id: 'n7', player_id: 'p7', team_id: 'demo-team-id', sport: 'nfl', salary: 9, year2: null, year3: null, year4: null, status: 'active', players: { name: 'Tank Dell', position: 'WR' } },
  { id: 'n8', player_id: 'p8', team_id: 'demo-team-id', sport: 'nfl', salary: 7, year2: 8, year3: 9, year4: null, status: 'active', players: { name: 'Puka Nacua', position: 'WR' } },
  { id: 'n9', player_id: 'p9', team_id: 'demo-team-id', sport: 'nfl', salary: 5, year2: null, year3: null, year4: null, status: 'active', players: { name: 'Zay Flowers', position: 'WR' } },
  { id: 'n10', player_id: 'p10', team_id: 'demo-team-id', sport: 'nfl', salary: 3, year2: null, year3: null, year4: null, status: 'dl', players: { name: 'Chris Olave', position: 'WR' } },
  { id: 'n11', player_id: 'p11', team_id: 'demo-team-id', sport: 'nfl', salary: 1, year2: 2, year3: 3, year4: null, status: 'minors', players: { name: 'Cam Ward', position: 'QB' } },
  { id: 'n12', player_id: 'p12', team_id: 'demo-team-id', sport: 'nfl', salary: 0, year2: 1, year3: null, year4: null, status: 'minors', players: { name: 'Shedeur Sanders', position: 'QB' } },

  // NBA
  { id: 'b1', player_id: 'bp1', team_id: 'demo-team-id', sport: 'nba', salary: 35, year2: 35, year3: null, year4: null, status: 'active', players: { name: 'Jayson Tatum', position: 'SF' } },
  { id: 'b2', player_id: 'bp2', team_id: 'demo-team-id', sport: 'nba', salary: 28, year2: null, year3: null, year4: null, status: 'active', players: { name: 'Tyrese Haliburton', position: 'PG' } },
  { id: 'b3', player_id: 'bp3', team_id: 'demo-team-id', sport: 'nba', salary: 22, year2: 22, year3: null, year4: null, status: 'active', players: { name: 'Paolo Banchero', position: 'PF' } },
  { id: 'b4', player_id: 'bp4', team_id: 'demo-team-id', sport: 'nba', salary: 16, year2: null, year3: null, year4: null, status: 'active', players: { name: 'Scottie Barnes', position: 'PF' } },
  { id: 'b5', player_id: 'bp5', team_id: 'demo-team-id', sport: 'nba', salary: 12, year2: 12, year3: 12, year4: null, status: 'active', players: { name: 'Chet Holmgren', position: 'C' } },
  { id: 'b6', player_id: 'bp6', team_id: 'demo-team-id', sport: 'nba', salary: 10, year2: null, year3: null, year4: null, status: 'active', players: { name: 'Jalen Williams', position: 'SG' } },
  { id: 'b7', player_id: 'bp7', team_id: 'demo-team-id', sport: 'nba', salary: 8, year2: 8, year3: null, year4: null, status: 'active', players: { name: 'Amen Thompson', position: 'SG' } },
  { id: 'b8', player_id: 'bp8', team_id: 'demo-team-id', sport: 'nba', salary: 3, year2: null, year3: null, year4: null, status: 'active', players: { name: 'Brandin Podziemski', position: 'PG' } },
  { id: 'b9', player_id: 'bp9', team_id: 'demo-team-id', sport: 'nba', salary: 6, year2: 7, year3: 8, year4: 9, status: 'minors', players: { name: 'Cooper Flagg', position: 'PF' } },
  { id: 'b10', player_id: 'bp10', team_id: 'demo-team-id', sport: 'nba', salary: 2, year2: null, year3: null, year4: null, status: 'ir', players: { name: 'Dereck Lively II', position: 'C' } },

  // MLB
  { id: 'm1', player_id: 'mp1', team_id: 'demo-team-id', sport: 'mlb', salary: 38, year2: 38, year3: null, year4: null, status: 'active', players: { name: 'Shohei Ohtani', position: 'DH/SP' } },
  { id: 'm2', player_id: 'mp2', team_id: 'demo-team-id', sport: 'mlb', salary: 32, year2: null, year3: null, year4: null, status: 'active', players: { name: 'Juan Soto', position: 'OF' } },
  { id: 'm3', player_id: 'mp3', team_id: 'demo-team-id', sport: 'mlb', salary: 24, year2: 24, year3: null, year4: null, status: 'active', players: { name: 'Bobby Witt Jr.', position: 'SS' } },
  { id: 'm4', player_id: 'mp4', team_id: 'demo-team-id', sport: 'mlb', salary: 20, year2: 20, year3: 20, year4: null, status: 'active', players: { name: 'Gunnar Henderson', position: 'SS' } },
  { id: 'm5', player_id: 'mp5', team_id: 'demo-team-id', sport: 'mlb', salary: 18, year2: null, year3: null, year4: null, status: 'active', players: { name: 'Corbin Carroll', position: 'OF' } },
  { id: 'm6', player_id: 'mp6', team_id: 'demo-team-id', sport: 'mlb', salary: 15, year2: 15, year3: null, year4: null, status: 'active', players: { name: 'Spencer Strider', position: 'SP' } },
  { id: 'm7', player_id: 'mp7', team_id: 'demo-team-id', sport: 'mlb', salary: 12, year2: null, year3: null, year4: null, status: 'active', players: { name: 'Elly De La Cruz', position: 'SS' } },
  { id: 'm8', player_id: 'mp8', team_id: 'demo-team-id', sport: 'mlb', salary: 10, year2: 10, year3: null, year4: null, status: 'active', players: { name: 'Grayson Rodriguez', position: 'SP' } },
  { id: 'm9', player_id: 'mp9', team_id: 'demo-team-id', sport: 'mlb', salary: 8, year2: null, year3: null, year4: null, status: 'active', players: { name: 'Jackson Chourio', position: 'OF' } },
  { id: 'm10', player_id: 'mp10', team_id: 'demo-team-id', sport: 'mlb', salary: 6, year2: null, year3: null, year4: null, status: 'active', players: { name: 'Evan Carter', position: 'OF' } },
  { id: 'm11', player_id: 'mp11', team_id: 'demo-team-id', sport: 'mlb', salary: 5, year2: 5, year3: null, year4: null, status: 'active', players: { name: 'Andrew Painter', position: 'SP' } },
  { id: 'm12', player_id: 'mp12', team_id: 'demo-team-id', sport: 'mlb', salary: 4, year2: null, year3: null, year4: null, status: 'dl', players: { name: 'Kumar Rocker', position: 'SP' } },
  { id: 'm13', player_id: 'mp13', team_id: 'demo-team-id', sport: 'mlb', salary: 3, year2: 6, year3: 9, year4: null, status: 'minors', players: { name: 'Jackson Merrill', position: 'OF' } },
  { id: 'm14', player_id: 'mp14', team_id: 'demo-team-id', sport: 'mlb', salary: 1, year2: null, year3: null, year4: null, status: 'minors', players: { name: 'Bryce Eldridge', position: '1B' } },
  { id: 'm15', player_id: 'mp15', team_id: 'demo-team-id', sport: 'mlb', salary: 2, year2: null, year3: null, year4: null, status: 'drafted', players: { name: 'Samuel Basallo', position: 'C' } },
]

// All 10 teams cap data for league overview
export const DEMO_ALL_CAP_STATES = [
  { id: 'a1', team_id: 't1', sport: 'nfl', total_cap: 200, spent: 157, teams: { name: 'Dallas' } },
  { id: 'a2', team_id: 't2', sport: 'nfl', total_cap: 200, spent: 182, teams: { name: 'Boston' } },
  { id: 'a3', team_id: 't3', sport: 'nfl', total_cap: 200, spent: 144, teams: { name: 'Ft. Wayne' } },
  { id: 'a4', team_id: 't4', sport: 'nfl', total_cap: 200, spent: 168, teams: { name: 'Greenville' } },
  { id: 'a5', team_id: 't5', sport: 'nfl', total_cap: 200, spent: 191, teams: { name: 'Karmiel' } },
  { id: 'a6', team_id: 't6', sport: 'nfl', total_cap: 200, spent: 155, teams: { name: 'Las Vegas' } },
  { id: 'a7', team_id: 't7', sport: 'nfl', total_cap: 200, spent: 176, teams: { name: 'Lufkin' } },
  { id: 'a8', team_id: 't8', sport: 'nfl', total_cap: 200, spent: 130, teams: { name: 'Oklahoma City' } },
  { id: 'a9', team_id: 't9', sport: 'nfl', total_cap: 200, spent: 163, teams: { name: 'Pittsburgh' } },
  { id: 'a10', team_id: 't10', sport: 'nfl', total_cap: 200, spent: 148, teams: { name: 'San Diego' } },

  { id: 'b1', team_id: 't1', sport: 'nba', total_cap: 200, spent: 134, teams: { name: 'Dallas' } },
  { id: 'b2', team_id: 't2', sport: 'nba', total_cap: 200, spent: 171, teams: { name: 'Boston' } },
  { id: 'b3', team_id: 't3', sport: 'nba', total_cap: 200, spent: 158, teams: { name: 'Ft. Wayne' } },
  { id: 'b4', team_id: 't4', sport: 'nba', total_cap: 200, spent: 142, teams: { name: 'Greenville' } },
  { id: 'b5', team_id: 't5', sport: 'nba', total_cap: 200, spent: 188, teams: { name: 'Karmiel' } },
  { id: 'b6', team_id: 't6', sport: 'nba', total_cap: 200, spent: 125, teams: { name: 'Las Vegas' } },
  { id: 'b7', team_id: 't7', sport: 'nba', total_cap: 200, spent: 166, teams: { name: 'Lufkin' } },
  { id: 'b8', team_id: 't8', sport: 'nba', total_cap: 200, spent: 149, teams: { name: 'Oklahoma City' } },
  { id: 'b9', team_id: 't9', sport: 'nba', total_cap: 200, spent: 177, teams: { name: 'Pittsburgh' } },
  { id: 'b10', team_id: 't10', sport: 'nba', total_cap: 200, spent: 139, teams: { name: 'San Diego' } },

  { id: 'c1', team_id: 't1', sport: 'mlb', total_cap: 260, spent: 198, teams: { name: 'Dallas' } },
  { id: 'c2', team_id: 't2', sport: 'mlb', total_cap: 260, spent: 231, teams: { name: 'Boston' } },
  { id: 'c3', team_id: 't3', sport: 'mlb', total_cap: 260, spent: 210, teams: { name: 'Ft. Wayne' } },
  { id: 'c4', team_id: 't4', sport: 'mlb', total_cap: 260, spent: 185, teams: { name: 'Greenville' } },
  { id: 'c5', team_id: 't5', sport: 'mlb', total_cap: 260, spent: 248, teams: { name: 'Karmiel' } },
  { id: 'c6', team_id: 't6', sport: 'mlb', total_cap: 260, spent: 195, teams: { name: 'Las Vegas' } },
  { id: 'c7', team_id: 't7', sport: 'mlb', total_cap: 260, spent: 222, teams: { name: 'Lufkin' } },
  { id: 'c8', team_id: 't8', sport: 'mlb', total_cap: 260, spent: 175, teams: { name: 'Oklahoma City' } },
  { id: 'c9', team_id: 't9', sport: 'mlb', total_cap: 260, spent: 204, teams: { name: 'Pittsburgh' } },
  { id: 'c10', team_id: 't10', sport: 'mlb', total_cap: 260, spent: 190, teams: { name: 'San Diego' } },

  // Include Cleveland
  { id: 'd1', team_id: 't11', sport: 'nfl', total_cap: 200, spent: 172, teams: { name: 'Cleveland' } },
  { id: 'd2', team_id: 't11', sport: 'nba', total_cap: 200, spent: 153, teams: { name: 'Cleveland' } },
  { id: 'd3', team_id: 't11', sport: 'mlb', total_cap: 260, spent: 216, teams: { name: 'Cleveland' } },
]

export const DEMO_TRANSACTIONS = [
  { id: 'tx1', type: 'fa_sign', team_id: 't1', player_id: 'p1', sport: 'nfl', timestamp: '2025-03-28T14:30:00Z', teams: { name: 'Dallas' }, players: { name: 'Puka Nacua' }, notes: '$7/3yr — won FA bid', is_manual_entry: false },
  { id: 'tx2', type: 'dl_move', team_id: 't2', player_id: 'p2', sport: 'nba', timestamp: '2025-03-27T10:15:00Z', teams: { name: 'Boston' }, players: { name: 'Jaylen Brown' }, notes: 'Moved to DL', is_manual_entry: false },
  { id: 'tx3', type: 'trade', team_id: 't3', player_id: 'p3', sport: 'mlb', timestamp: '2025-03-26T18:00:00Z', teams: { name: 'Ft. Wayne' }, players: { name: 'Corbin Carroll' }, notes: 'Traded to Lufkin for 1st round pick', is_manual_entry: false },
  { id: 'tx4', type: 'resign', team_id: 't5', player_id: 'p5', sport: 'nfl', timestamp: '2025-03-25T09:45:00Z', teams: { name: 'Karmiel' }, players: { name: 'Lamar Jackson' }, notes: 'Re-signed $48/2yr', is_manual_entry: false },
  { id: 'tx5', type: 'minors_add', team_id: 't1', player_id: 'p6', sport: 'mlb', timestamp: '2025-03-24T16:20:00Z', teams: { name: 'Dallas' }, players: { name: 'Bryce Eldridge' }, notes: 'Added to minors roster', is_manual_entry: true },
]
