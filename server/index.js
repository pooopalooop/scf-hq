import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Supabase admin client (uses service role key for server-side operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'scf-hq-api' })
})

// ============================================================
// MLB STATS API PROXY (avoids CORS issues from browser)
// ============================================================
app.get('/api/mlb/search', async (req, res) => {
  try {
    const { q } = req.query
    if (!q) return res.status(400).json({ error: 'Query required' })

    const url = `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(q)}&sportIds=1,11,12,13,14,16&hydrate=currentTeam`
    const response = await fetch(url)
    const data = await response.json()
    res.json(data)
  } catch (err) {
    console.error('MLB search error:', err)
    res.status(500).json({ error: 'MLB API error' })
  }
})

app.get('/api/mlb/stats/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params
    const url = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=career&group=hitting,pitching&sportId=1`
    const response = await fetch(url)
    const data = await response.json()
    res.json(data)
  } catch (err) {
    console.error('MLB stats error:', err)
    res.status(500).json({ error: 'MLB API error' })
  }
})

// ============================================================
// TEAM ROSTER ENDPOINT
// ============================================================
app.get('/api/teams/:teamId/roster', async (req, res) => {
  try {
    const { teamId } = req.params
    const { sport } = req.query

    let query = supabase
      .from('contracts')
      .select('*, players(*)')
      .eq('team_id', teamId)

    if (sport) query = query.eq('sport', sport)

    const { data, error } = await query.order('salary', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (err) {
    console.error('Roster error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
// CAP STATE
// ============================================================
app.get('/api/teams/:teamId/cap', async (req, res) => {
  try {
    const { teamId } = req.params
    const { data, error } = await supabase
      .from('cap_state')
      .select('*')
      .eq('team_id', teamId)

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
// LEAGUE OVERVIEW — all teams cap state
// ============================================================
app.get('/api/league/cap', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cap_state')
      .select('*, teams(name)')
      .order('team_id')

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
// TRANSACTIONS
// ============================================================
app.get('/api/transactions', async (req, res) => {
  try {
    const { limit = 50 } = req.query
    const { data, error } = await supabase
      .from('transactions')
      .select('*, teams(name), players(name)')
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit))

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
// FA BIDS
// ============================================================
app.get('/api/fa-bids', async (req, res) => {
  try {
    const { status = 'active' } = req.query
    const { data, error } = await supabase
      .from('fa_bids')
      .select('*, teams:bidding_team_id(name)')
      .eq('status', status)
      .order('expires_at', { ascending: true })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`SCF/HQ API running on port ${PORT}`)
})
