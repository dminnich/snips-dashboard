const express = require('express')
const Database = require('better-sqlite3')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000
const DATA_DIR = process.env.DATA_DIR || __dirname
const DB_PATH = path.join(DATA_DIR, 'data.db')

let db
try {
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
} catch (err) {
  console.error('Failed to open database:', err.message)
  process.exit(1)
}

db.exec(`
  CREATE TABLE IF NOT EXISTS months (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT DEFAULT '',
    subtitle TEXT DEFAULT '',
    specialEvents TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS weeks (
    id TEXT PRIMARY KEY,
    weekNumber INTEGER NOT NULL,
    subtitle TEXT DEFAULT '',
    specialEvents TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    weekId TEXT NOT NULL,
    groupName TEXT NOT NULL,
    headcount INTEGER DEFAULT 0,
    housing TEXT DEFAULT '',
    status TEXT DEFAULT 'pending'
  );
`)

const monthCount = db.prepare('SELECT COUNT(*) as count FROM months').get().count
if (monthCount === 0) {
  const insertMonth = db.prepare('INSERT INTO months (id, name) VALUES (?, ?)')
  const months = [
    'January', 'February', 'March', 'April', 'May',
    'August', 'September', 'October', 'November', 'December',
  ]
  for (const name of months) {
    insertMonth.run(name.toLowerCase(), name)
  }

  const insertWeek = db.prepare('INSERT INTO weeks (id, weekNumber) VALUES (?, ?)')
  for (let i = 1; i <= 10; i++) {
    insertWeek.run(`week-${i}`, i)
  }

  console.log('Seeded default data')
}

app.use(express.json())
app.use(express.static(path.join(__dirname, 'dist')))

app.get('/api/data', (req, res) => {
  try {
    const months = db.prepare('SELECT * FROM months ORDER BY id').all()
    const weeks = db.prepare('SELECT * FROM weeks ORDER BY weekNumber').all()
    const events = db.prepare('SELECT * FROM events').all()

    const weeksWithEvents = weeks.map((w) => ({
      ...w,
      events: events.filter((e) => e.weekId === w.id),
    }))

    res.json({ months, weeks: weeksWithEvents })
  } catch (err) {
    console.error('GET /api/data', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.patch('/api/months/:id', (req, res) => {
  try {
    const { content, subtitle, specialEvents } = req.body
    if (typeof content !== 'string' || content.length > 1_000_000) {
      return res.status(400).json({ error: 'Invalid content' })
    }
    db.prepare('UPDATE months SET content = ?, subtitle = ?, specialEvents = ? WHERE id = ?')
      .run(content ?? '', subtitle ?? '', specialEvents ?? '', req.params.id)
    res.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/months/:id', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.patch('/api/weeks/:id', (req, res) => {
  try {
    const { subtitle, specialEvents } = req.body
    db.prepare('UPDATE weeks SET subtitle = ?, specialEvents = ? WHERE id = ?')
      .run(subtitle ?? '', specialEvents ?? '', req.params.id)
    res.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/weeks/:id', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/weeks/:id/events', (req, res) => {
  try {
    const { id, groupName, headcount, housing, status } = req.body
    if (typeof groupName !== 'string' || !groupName.trim()) {
      return res.status(400).json({ error: 'groupName is required' })
    }
    if (groupName.length > 200) {
      return res.status(400).json({ error: 'groupName too long' })
    }
    const eventId = require('crypto').randomUUID()
    if (id !== undefined && id !== eventId) {
      console.warn('POST /api/weeks/:id/events: client-supplied id ignored', { clientId: id, serverId: eventId })
    }
    db.prepare('INSERT INTO events (id, weekId, groupName, headcount, housing, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run(eventId, req.params.id, groupName, headcount ?? 0, housing ?? '', status ?? 'pending')
    res.json({ id: eventId })
  } catch (err) {
    console.error('POST /api/weeks/:id/events', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.patch('/api/weeks/:wid/events/:eid', (req, res) => {
  try {
    const { groupName, headcount, housing, status } = req.body
    const sets = []
    const vals = []
    if (groupName !== undefined) {
      if (typeof groupName !== 'string' || !groupName.trim()) {
        return res.status(400).json({ error: 'groupName must be a non-empty string' })
      }
      sets.push('groupName = ?'); vals.push(groupName)
    }
    if (headcount !== undefined) { sets.push('headcount = ?'); vals.push(headcount) }
    if (housing !== undefined) { sets.push('housing = ?'); vals.push(housing) }
    if (status !== undefined) { sets.push('status = ?'); vals.push(status) }
    if (sets.length === 0) return res.json({ ok: true })
    vals.push(req.params.eid)
    db.prepare(`UPDATE events SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    res.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/weeks/:wid/events/:eid', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.delete('/api/weeks/:wid/events/:eid', (req, res) => {
  try {
    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.eid)
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/weeks/:wid/events/:eid', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.put('/api/data', (req, res) => {
  try {
    const { months, weeks } = req.body
    const tx = db.transaction(() => {
      db.exec('DELETE FROM events')
      db.exec('DELETE FROM weeks')
      db.exec('DELETE FROM months')
      if (months) {
        const ins = db.prepare('INSERT INTO months (id, name, content, subtitle, specialEvents) VALUES (?, ?, ?, ?, ?)')
        for (const m of months) {
          ins.run(m.id, m.name, m.content ?? '', m.subtitle ?? '', m.specialEvents ?? '')
        }
      }
      if (weeks) {
        const ins = db.prepare('INSERT INTO weeks (id, weekNumber, subtitle, specialEvents) VALUES (?, ?, ?, ?)')
        const insEv = db.prepare('INSERT INTO events (id, weekId, groupName, headcount, housing, status) VALUES (?, ?, ?, ?, ?, ?)')
        for (const w of weeks) {
          ins.run(w.id, w.weekNumber, w.subtitle ?? '', w.specialEvents ?? '')
          if (w.events) {
            for (const e of w.events) {
              insEv.run(e.id, w.id, e.groupName, e.headcount ?? 0, e.housing ?? '', e.status ?? 'pending')
            }
          }
        }
      }
    })
    tx()
    res.json({ ok: true })
  } catch (err) {
    console.error('PUT /api/data', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
