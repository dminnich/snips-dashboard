const express = require('express')
const Database = require('better-sqlite3')
const path = require('path')
const crypto = require('crypto')
const fs = require('fs')

const EVENT_STATUSES = ['mission', 'pending', 'paid']
const MAX_TEXT = 1_000_000
const MAX_SUBTITLE = 500
const MAX_HOUSING = 200

function stringError(value, field, max = MAX_TEXT) {
  if (typeof value !== 'string') return `${field} must be a string`
  if (value.length > max) return `${field} too long`
  return null
}

function sanitizeHtml(html) {
  if (typeof html !== 'string') return ''
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<\/?(?:iframe|object|embed|link|meta|base|form|input|button|textarea|select)\b[^>]*>/gi, '')
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(\s(?:href|src|action|formaction|background|poster|cite|srcset|xlink:href))\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"')
    .replace(/(\s(?:href|src|action|formaction|background|poster|cite|srcset|xlink:href))\s*=\s*'\s*javascript:[^']*'/gi, "$1='#'")
    .replace(/(\s(?:href|src|action|formaction|background|poster|cite|srcset|xlink:href))\s*=\s*javascript:[^\s>]*/gi, '$1="#"')
}

function validateData(data) {
  const errors = []
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return ['root must be an object']
  }
  if (!Array.isArray(data.months)) errors.push('months must be an array')
  if (!Array.isArray(data.weeks)) errors.push('weeks must be an array')
  if (errors.length) return errors

  for (const [i, m] of data.months.entries()) {
    if (!m || typeof m !== 'object') {
      errors.push(`months[${i}] must be an object`)
      continue
    }
    if (typeof m.id !== 'string') errors.push(`months[${i}].id must be a string`)
    if (typeof m.name !== 'string') errors.push(`months[${i}].name must be a string`)
    if (typeof m.content !== 'string') errors.push(`months[${i}].content must be a string`)
    if (typeof m.subtitle !== 'string') errors.push(`months[${i}].subtitle must be a string`)
    if (typeof m.specialEvents !== 'string') errors.push(`months[${i}].specialEvents must be a string`)
  }

  for (const [i, w] of data.weeks.entries()) {
    if (!w || typeof w !== 'object') {
      errors.push(`weeks[${i}] must be an object`)
      continue
    }
    if (typeof w.id !== 'string') errors.push(`weeks[${i}].id must be a string`)
    if (typeof w.weekNumber !== 'number') errors.push(`weeks[${i}].weekNumber must be a number`)
    if (typeof w.subtitle !== 'string') errors.push(`weeks[${i}].subtitle must be a string`)
    if (typeof w.specialEvents !== 'string') errors.push(`weeks[${i}].specialEvents must be a string`)
    if (!Array.isArray(w.events)) {
      errors.push(`weeks[${i}].events must be an array`)
      continue
    }
    for (const [j, e] of w.events.entries()) {
      if (!e || typeof e !== 'object') {
        errors.push(`weeks[${i}].events[${j}] must be an object`)
        continue
      }
      if (typeof e.id !== 'string') errors.push(`weeks[${i}].events[${j}].id must be a string`)
      if (typeof e.weekId !== 'string') errors.push(`weeks[${i}].events[${j}].weekId must be a string`)
      if (typeof e.groupName !== 'string') errors.push(`weeks[${i}].events[${j}].groupName must be a string`)
      if (typeof e.headcount !== 'number') errors.push(`weeks[${i}].events[${j}].headcount must be a number`)
      if (typeof e.housing !== 'string') errors.push(`weeks[${i}].events[${j}].housing must be a string`)
      if (typeof e.status !== 'string' || !EVENT_STATUSES.includes(e.status)) {
        errors.push(`weeks[${i}].events[${j}].status must be one of ${EVENT_STATUSES.join(', ')}`)
      }
    }
  }

  return errors
}

const app = express()
app.disable('x-powered-by')
const PORT = process.env.PORT || 3000
const DATA_DIR = process.env.DATA_DIR || __dirname
const DB_PATH = path.join(DATA_DIR, 'data.db')

let db
try {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
} catch (err) {
  console.error('Failed to open database:', err.message)
  throw err
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

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  )
  next()
})

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
    if (content !== undefined) {
      const err1 = stringError(content, 'content')
      if (err1) return res.status(400).json({ error: err1 })
    }
    if (subtitle !== undefined) {
      const err2 = stringError(subtitle, 'subtitle', MAX_SUBTITLE)
      if (err2) return res.status(400).json({ error: err2 })
    }
    if (specialEvents !== undefined) {
      const err3 = stringError(specialEvents, 'specialEvents')
      if (err3) return res.status(400).json({ error: err3 })
    }
    const cleanContent = sanitizeHtml(content ?? '')
    const cleanSubtitle = sanitizeHtml(subtitle ?? '')
    const cleanSpecial = sanitizeHtml(specialEvents ?? '')
    db.prepare('UPDATE months SET content = ?, subtitle = ?, specialEvents = ? WHERE id = ?')
      .run(cleanContent, cleanSubtitle, cleanSpecial, req.params.id)
    res.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/months/:id', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.patch('/api/weeks/:id', (req, res) => {
  try {
    const { subtitle, specialEvents } = req.body
    if (subtitle !== undefined) {
      const err1 = stringError(subtitle, 'subtitle', MAX_SUBTITLE)
      if (err1) return res.status(400).json({ error: err1 })
    }
    if (specialEvents !== undefined) {
      const err2 = stringError(specialEvents, 'specialEvents')
      if (err2) return res.status(400).json({ error: err2 })
    }
    const cleanSubtitle = sanitizeHtml(subtitle ?? '')
    const cleanSpecial = sanitizeHtml(specialEvents ?? '')
    db.prepare('UPDATE weeks SET subtitle = ?, specialEvents = ? WHERE id = ?')
      .run(cleanSubtitle, cleanSpecial, req.params.id)
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
    if (headcount !== undefined && typeof headcount !== 'number') {
      return res.status(400).json({ error: 'headcount must be a number' })
    }
    const err1 = stringError(housing, 'housing', MAX_HOUSING)
    if (err1) return res.status(400).json({ error: err1 })
    if (status !== undefined && !EVENT_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${EVENT_STATUSES.join(', ')}` })
    }
    const eventId = crypto.randomUUID()
    if (id !== undefined && id !== eventId) {
      console.warn('POST /api/weeks/:id/events: client-supplied id ignored', { clientId: id, serverId: eventId })
    }
    const cleanGroupName = sanitizeHtml(groupName)
    const cleanHousing = sanitizeHtml(housing ?? '')
    db.prepare('INSERT INTO events (id, weekId, groupName, headcount, housing, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run(eventId, req.params.id, cleanGroupName, headcount ?? 0, cleanHousing, status ?? 'pending')
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
      sets.push('groupName = ?'); vals.push(sanitizeHtml(groupName))
    }
    if (headcount !== undefined) {
      if (typeof headcount !== 'number') {
        return res.status(400).json({ error: 'headcount must be a number' })
      }
      sets.push('headcount = ?'); vals.push(headcount)
    }
    if (housing !== undefined) {
      const err1 = stringError(housing, 'housing', MAX_HOUSING)
      if (err1) return res.status(400).json({ error: err1 })
      sets.push('housing = ?'); vals.push(sanitizeHtml(housing))
    }
    if (status !== undefined) {
      if (!EVENT_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of ${EVENT_STATUSES.join(', ')}` })
      }
      sets.push('status = ?'); vals.push(status)
    }
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
    const errors = validateData(req.body)
    if (errors.length) {
      return res.status(400).json({ error: 'Invalid data shape', details: errors })
    }
    const { months, weeks } = req.body
    const tx = db.transaction(() => {
      db.exec('DELETE FROM events')
      db.exec('DELETE FROM weeks')
      db.exec('DELETE FROM months')
      const insMonth = db.prepare('INSERT INTO months (id, name, content, subtitle, specialEvents) VALUES (?, ?, ?, ?, ?)')
      for (const m of months) {
        insMonth.run(
          m.id,
          m.name,
          sanitizeHtml(m.content),
          sanitizeHtml(m.subtitle),
          sanitizeHtml(m.specialEvents),
        )
      }
      const insWeek = db.prepare('INSERT INTO weeks (id, weekNumber, subtitle, specialEvents) VALUES (?, ?, ?, ?)')
      const insEv = db.prepare('INSERT INTO events (id, weekId, groupName, headcount, housing, status) VALUES (?, ?, ?, ?, ?, ?)')
      for (const w of weeks) {
        insWeek.run(w.id, w.weekNumber, sanitizeHtml(w.subtitle), sanitizeHtml(w.specialEvents))
        for (const e of w.events) {
          insEv.run(
            e.id,
            e.weekId,
            sanitizeHtml(e.groupName),
            e.headcount,
            sanitizeHtml(e.housing),
            e.status,
          )
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

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.use((err, req, res) => {
  console.error(err)
  if (req.path.startsWith('/api/')) {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
  } else {
    res.status(err.status || 500).type('text/plain').send(err.message || 'Internal server error')
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
