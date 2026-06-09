const express = require('express')
const Database = require('better-sqlite3')
const path = require('path')
const crypto = require('crypto')
const fs = require('fs')
const { JSDOM } = require('jsdom')
const rateLimit = require('express-rate-limit')
const createDOMPurify = require('dompurify')

const window = new JSDOM('').window
const DOMPurify = createDOMPurify(window)

const EVENT_STATUSES = ['mission', 'pending', 'paid']
const MAX_TEXT = 1_000_000
const MAX_SUBTITLE = 500
const MAX_HOUSING = 200

function stringError(value, field, max = MAX_TEXT) {
  if (typeof value !== 'string') {
    const msg = `${field} must be a string`
    console.log(`[${new Date().toISOString()}] stringError: ${msg}`)
    return msg
  }
  if (value.length > max) {
    const msg = `${field} too long (max ${max})`
    console.log(`[${new Date().toISOString()}] stringError: ${msg}`)
    return msg
  }
  return null
}

function sanitizeHtml(html) {
  if (typeof html !== 'string') return ''
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'font', 'span', 'div', 'p', 'br', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['size', 'color', 'style', 'href'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  })
  if (html && clean !== html) {
    console.log(`[${new Date().toISOString()}] sanitizeHtml: input was sanitized (${html.length} → ${clean.length} chars)`)
  }
  return clean
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

  if (errors.length) {
    console.log(`[${new Date().toISOString()}] validateData: ${errors.length} validation error(s)`)
  }
  return errors
}

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)
const PORT = process.env.PORT || 3000
const DATA_DIR = process.env.DATA_DIR || __dirname
const DB_PATH = path.join(DATA_DIR, 'data.db')

const dbExists = fs.existsSync(DB_PATH)
let db
try {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  console.log(`[${new Date().toISOString()}] Database: ${dbExists ? 'Found existing' : 'Created new'} database at ${DB_PATH}`)
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

  console.log(`[${new Date().toISOString()}] Database: Seeded default data (10 months, 10 weeks)`)
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

function nginxTime(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${d}/${months[date.getUTCMonth()]}/${date.getUTCFullYear()}:${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')} +0000`
}

function remoteUser(req) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Basic ')) return '-'
  try {
    return Buffer.from(auth.slice(6), 'base64').toString().split(':')[0]
  } catch { return '-' }
}

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    const bytes = res.getHeader('Content-Length') ?? '-'
    console.log(`${req.ip} - ${remoteUser(req)} [${nginxTime(new Date())}] "${req.method} ${req.originalUrl} HTTP/${req.httpVersion}" ${res.statusCode} ${bytes} "${req.headers.referer || '-'}" "${req.headers['user-agent'] || '-'}"`)
  })
  next()
})

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

console.log(`[${new Date().toISOString()}] Rate limiter: 100 req/min for /api/`)

const apiWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many write requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

console.log(`[${new Date().toISOString()}] Rate limiter: 30 req/min for write operations on /api/months/ and /api/weeks/`)

app.use('/api/', apiLimiter)
app.use(['/api/months/', '/api/weeks/'], apiWriteLimiter)



// Basic Authentication Middleware
const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true'
const AUTH_USERNAME = process.env.AUTH_USERNAME || 'admin'
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'changeme'

function basicAuth(req, res, next) {
  if (!AUTH_ENABLED) return next()
  if (req.path === '/health') return next()

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    console.log(`[${new Date().toISOString()}] Auth: missing or malformed authorization header from ${req.ip}`)
    res.setHeader('WWW-Authenticate', 'Basic realm="Dashboard"')
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8')
    const [username, password] = credentials.split(':')

    if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
      return next()
    }
  } catch (err) {
    // Invalid base64 encoding
  }

  console.log(`[${new Date().toISOString()}] Auth: invalid credentials attempt from ${req.ip}`)
  res.setHeader('WWW-Authenticate', 'Basic realm="Dashboard"')
  res.status(401).json({ error: 'Invalid credentials' })
}

app.use(basicAuth)

app.use(express.json())
app.use(express.static(path.join(__dirname, 'dist')))


console.log(`[${new Date().toISOString()}] Route: GET /health`)

// Health Check Endpoint
app.get('/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get()
    res.json({ status: 'healthy', timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message })
  }
})

app.get('/api/data', (req, res) => {
  try {
    const months = db.prepare('SELECT * FROM months ORDER BY id').all()
    const weeks = db.prepare('SELECT * FROM weeks ORDER BY weekNumber').all()
    const events = db.prepare('SELECT * FROM events').all()
    console.log(`[${new Date().toISOString()}] Data load: ${months.length} months, ${weeks.length} weeks, ${events.length} events`)

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

console.log(`[${new Date().toISOString()}] Route: PATCH /api/months/:id`)

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
    console.log(`[${new Date().toISOString()}] Month updated: ${req.params.id}`)
    res.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/months/:id', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

console.log(`[${new Date().toISOString()}] Route: PATCH /api/weeks/:id`)

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
    console.log(`[${new Date().toISOString()}] Week updated: ${req.params.id}`)
    res.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/weeks/:id', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

console.log(`[${new Date().toISOString()}] Route: POST /api/weeks/:id/events`)

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
    console.log(`[${new Date().toISOString()}] Event created: ${eventId} (${cleanGroupName}) in week ${req.params.id}`)
    res.json({ id: eventId })
  } catch (err) {
    console.error('POST /api/weeks/:id/events', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

console.log(`[${new Date().toISOString()}] Route: PATCH /api/weeks/:wid/events/:eid`)

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
    console.log(`[${new Date().toISOString()}] Event updated: ${req.params.eid} (fields: ${sets.map(s => s.split(' ')[0]).join(', ')})`)
    res.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/weeks/:wid/events/:eid', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

console.log(`[${new Date().toISOString()}] Route: DELETE /api/weeks/:wid/events/:eid`)

app.delete('/api/weeks/:wid/events/:eid', (req, res) => {
  try {
    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.eid)
    console.log(`[${new Date().toISOString()}] Event deleted: ${req.params.eid}`)
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/weeks/:wid/events/:eid', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

console.log(`[${new Date().toISOString()}] Route: PUT /api/data`)

app.put('/api/data', (req, res) => {
  try {
    const errors = validateData(req.body)
    if (errors.length) {
      return res.status(400).json({ error: 'Invalid data shape', details: errors })
    }
    const { months, weeks } = req.body
    console.log(`[${new Date().toISOString()}] Data replace: replacing all data with ${months.length} months and ${weeks.length} weeks`)
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
    console.log(`[${new Date().toISOString()}] Data replace: completed successfully`)
    res.json({ ok: true })
  } catch (err) {
    console.error('PUT /api/data', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.use((req, res) => {
  console.log(`[${new Date().toISOString()}] 404: ${req.method} ${req.originalUrl}`)
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

function shutdown(signal) {
  console.log(`[${new Date().toISOString()}] Received ${signal}, shutting down gracefully...`)
  server.close(() => {
    db.close()
    console.log(`[${new Date().toISOString()}] Server closed`)
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

const server = app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Starting Snips Dashboard server...`)
  console.log(`[${new Date().toISOString()}] Port: ${PORT}`)
  console.log(`[${new Date().toISOString()}] Data directory: ${DATA_DIR}`)
  console.log(`[${new Date().toISOString()}] Database: ${DB_PATH}`)
  console.log(`[${new Date().toISOString()}] Authentication: ${AUTH_ENABLED ? 'enabled' : 'disabled'}`)
  console.log(`[${new Date().toISOString()}] Trust proxy: 1`)
  console.log(`[${new Date().toISOString()}] Server running on http://localhost:${PORT}`)
})
