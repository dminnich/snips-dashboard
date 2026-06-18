const express = require('express')
const Database = require('better-sqlite3')
const path = require('path')
const crypto = require('crypto')
const fs = require('fs')
const { JSDOM } = require('jsdom')
const rateLimit = require('express-rate-limit')
const createDOMPurify = require('dompurify')
const { startIcsSync, syncNow, placeDashboardEvent } = require('./sync/icsSync')

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
      if (typeof e.groupName !== 'string') errors.push(`weeks[${i}].events[${j}].groupName must be a string`)
      if (!Number.isInteger(e.headcount) || e.headcount < 0) errors.push(`weeks[${i}].events[${j}].headcount must be a non-negative integer`)
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
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    subtitle TEXT DEFAULT '',
    specialEvents TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS weeks (
    id TEXT PRIMARY KEY,
    weekNumber INTEGER NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    subtitle TEXT DEFAULT '',
    specialEvents TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    groupName TEXT NOT NULL,
    headcount INTEGER DEFAULT 0,
    housing TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    origin TEXT DEFAULT 'dashboard',
    icsUid TEXT,
    sequence INTEGER DEFAULT 0,
    lastModified TEXT,
    lastSeen TEXT,
    startDate TEXT,
    endDate TEXT
  );

  CREATE TABLE IF NOT EXISTS event_months (
    eventId TEXT NOT NULL,
    monthId TEXT NOT NULL,
    PRIMARY KEY (eventId, monthId),
    FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (monthId) REFERENCES months(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS event_weeks (
    eventId TEXT NOT NULL,
    weekId TEXT NOT NULL,
    PRIMARY KEY (eventId, weekId),
    FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (weekId) REFERENCES weeks(id) ON DELETE CASCADE
  );
`)

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth(); // 0-indexed: 0=Jan, 5=Jun, 8=Sep, 11=Dec

function syncRollingWindow() {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth();

  function expectedYearForMonth(monthName) {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const mi = monthNames.indexOf(monthName.toLowerCase());
    return mi < cm ? cy + 1 : cy;
  }

  function expectedYearForWeeks() {
    return cm > 7 ? cy + 1 : cy;
  }

  let updated = false;

  const months = db.prepare('SELECT * FROM months ORDER BY id').all();
  for (const m of months) {
    const expectedYear = expectedYearForMonth(m.name);
    const expected = getMonthDates(m.name, expectedYear);
    if (m.startDate !== expected.start || m.endDate !== expected.end) {
      db.prepare('UPDATE months SET startDate = ?, endDate = ? WHERE id = ?').run(expected.start, expected.end, m.id);
      updated = true;
    }
  }

  const weeks = db.prepare('SELECT * FROM weeks ORDER BY weekNumber').all();
  const weekYear = expectedYearForWeeks();
  for (const w of weeks) {
    const expected = getWeekDates(w.weekNumber, weekYear);
    if (w.startDate !== expected.start || w.endDate !== expected.end) {
      db.prepare('UPDATE weeks SET startDate = ?, endDate = ? WHERE id = ?').run(expected.start, expected.end, w.id);
      updated = true;
    }
  }

  if (updated) {
    // Re-place all events after date shift
    db.prepare('DELETE FROM event_months').run();
    db.prepare('DELETE FROM event_weeks').run();
    const events = db.prepare('SELECT * FROM events WHERE startDate IS NOT NULL').all();
    const insMonth = db.prepare('INSERT INTO event_months (eventId, monthId) VALUES (?, ?)');
    const insWeek = db.prepare('INSERT INTO event_weeks (eventId, weekId) VALUES (?, ?)');
    for (const e of events) {
      const eventEnd = e.endDate || e.startDate;
      const overlappingMonths = db.prepare('SELECT id FROM months WHERE startDate <= ? AND endDate >= ?').all(eventEnd, e.startDate);
      for (const { id: monthId } of overlappingMonths) {
        insMonth.run(e.id, monthId);
      }
      const overlappingWeeks = db.prepare('SELECT id FROM weeks WHERE startDate <= ? AND endDate >= ?').all(eventEnd, e.startDate);
      for (const { id: weekId } of overlappingWeeks) {
        insWeek.run(e.id, weekId);
      }
    }
    console.log(`[${new Date().toISOString()}] Rolling window synced to ${cy}-${cy + 1}`);
  }
}

function getYearForMonth(monthName) {
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthIndex = monthNames.indexOf(monthName.toLowerCase());
  // Rolling 12-month window: months before current month get next year, months >= current month get current year
  return monthIndex < currentMonth ? currentYear + 1 : currentYear;
}

function getYearForWeeks() {
  // Summer weeks start May 31 (month index 4)
  // If we're past August (month index 7), the summer weeks belong to next year
  return currentMonth > 7 ? currentYear + 1 : currentYear;
}

function getMonthDates(name, year) {
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthIndex = monthNames.indexOf(name.toLowerCase());

  // Store dates at UTC noon to avoid timezone display issues
  // 2026-03-01T12:00:00Z displays as March 1 in all US timezones
  const start = new Date(Date.UTC(year, monthIndex, 1, 12, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0));
  return { start: start.toISOString(), end: end.toISOString() };
}

function getWeekDates(weekNumber, year) {
  // Week 1 starts May 31 at midnight NY time
  // Store at UTC noon to avoid timezone display issues
  const week1Start = new Date(Date.UTC(year, 4, 31, 12, 0, 0)); // May is month 4 (0-indexed)
  const start = new Date(week1Start);
  start.setDate(start.getDate() + (weekNumber - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  // Set to noon UTC for consistent display
  start.setUTCHours(12, 0, 0, 0);
  end.setUTCHours(12, 0, 0, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}

const monthCount = db.prepare('SELECT COUNT(*) as count FROM months').get().count
if (monthCount === 0) {
  const insertMonth = db.prepare('INSERT INTO months (id, name, startDate, endDate) VALUES (?, ?, ?, ?)')
  const months = [
    'January', 'February', 'March', 'April', 'May',
    'August', 'September', 'October', 'November', 'December',
  ]
  for (const name of months) {
    const year = getYearForMonth(name);
    const { start, end } = getMonthDates(name, year);
    insertMonth.run(name.toLowerCase(), name, start, end)
  }

  const insertWeek = db.prepare('INSERT INTO weeks (id, weekNumber, startDate, endDate) VALUES (?, ?, ?, ?)')
  const weekYear = getYearForWeeks();
  for (let i = 1; i <= 10; i++) {
    const { start, end } = getWeekDates(i, weekYear);
    insertWeek.run(`week-${i}`, i, start, end)
  }

  console.log(`[${new Date().toISOString()}] Database: Seeded default data for rolling window (10 months, 10 weeks with date ranges)`)
}

// Start ICS sync scheduler
startIcsSync(db);

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

console.log(`[${new Date().toISOString()}] Rate limiter: 30 req/min for write operations on /api/months/, /api/weeks/, /api/events, /api/reset, /api/sync/`)

app.use('/api/', apiLimiter)
app.use(['/api/months/', '/api/weeks/', '/api/events', '/api/reset', '/api/sync/'], apiWriteLimiter)



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

    const userBuf = Buffer.from(username ?? '')
    const passBuf = Buffer.from(password ?? '')
    const expectedUser = Buffer.from(AUTH_USERNAME)
    const expectedPass = Buffer.from(AUTH_PASSWORD)
    const userOk = userBuf.length === expectedUser.length && crypto.timingSafeEqual(userBuf, expectedUser)
    const passOk = passBuf.length === expectedPass.length && crypto.timingSafeEqual(passBuf, expectedPass)
    if (userOk && passOk) {
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
    syncRollingWindow();
    const months = db.prepare('SELECT * FROM months ORDER BY id').all()
    const weeks = db.prepare('SELECT * FROM weeks ORDER BY weekNumber').all()
    const events = db.prepare('SELECT * FROM events').all()

    // Get event placements
    const eventMonths = db.prepare('SELECT eventId, monthId FROM event_months').all()
    const eventWeeks = db.prepare('SELECT eventId, weekId FROM event_weeks').all()

    // Build placement maps
    const eventsByMonth = {}
    const eventsByWeek = {}

    for (const em of eventMonths) {
      if (!eventsByMonth[em.monthId]) eventsByMonth[em.monthId] = []
      eventsByMonth[em.monthId].push(em.eventId)
    }

    for (const ew of eventWeeks) {
      if (!eventsByWeek[ew.weekId]) eventsByWeek[ew.weekId] = []
      eventsByWeek[ew.weekId].push(ew.eventId)
    }

    const eventById = new Map(events.map(e => [e.id, e]))

    // Add events to months
    const monthsWithEvents = months.map((m) => ({
      ...m,
      events: (eventsByMonth[m.id] || []).map(id => eventById.get(id)),
    }))

    // Add events to weeks
    const weeksWithEvents = weeks.map((w) => ({
      ...w,
      events: (eventsByWeek[w.id] || []).map(id => eventById.get(id)),
    }))

    console.log(`[${new Date().toISOString()}] Data load: ${months.length} months, ${weeks.length} weeks, ${events.length} events`)

    res.json({
      months: monthsWithEvents,
      weeks: weeksWithEvents,
      icsEnabled: !!process.env.ICS_URL,
      dbEventsDisabled: process.env.DISABLE_DB_EVENTS === 'true'
    })
  } catch (err) {
    console.error('GET /api/data', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

console.log(`[${new Date().toISOString()}] Route: PATCH /api/months/:id`)

app.patch('/api/months/:id', (req, res) => {
  try {
    const { subtitle, specialEvents, startDate, endDate } = req.body
    if (subtitle !== undefined) {
      const err2 = stringError(subtitle, 'subtitle', MAX_SUBTITLE)
      if (err2) return res.status(400).json({ error: err2 })
    }
    if (specialEvents !== undefined) {
      const err3 = stringError(specialEvents, 'specialEvents')
      if (err3) return res.status(400).json({ error: err3 })
    }
    const cleanSubtitle = sanitizeHtml(subtitle ?? '')
    const cleanSpecial = sanitizeHtml(specialEvents ?? '')

    const updates = []
    const values = []
    if (subtitle !== undefined) { updates.push('subtitle = ?'); values.push(cleanSubtitle) }
    if (specialEvents !== undefined) { updates.push('specialEvents = ?'); values.push(cleanSpecial) }
    if (startDate !== undefined) { updates.push('startDate = ?'); values.push(startDate) }
    if (endDate !== undefined) { updates.push('endDate = ?'); values.push(endDate) }

    if (updates.length > 0) {
      values.push(req.params.id)
      db.prepare(`UPDATE months SET ${updates.join(', ')} WHERE id = ?`).run(...values)

      // Re-place events if dates changed
      if (startDate !== undefined || endDate !== undefined) {
        const updatedMonth = db.prepare('SELECT * FROM months WHERE id = ?').get(req.params.id)
        db.prepare('DELETE FROM event_months WHERE monthId = ?').run(req.params.id)
        const events = db.prepare('SELECT * FROM events WHERE startDate IS NOT NULL').all()
        const insEventMonth = db.prepare('INSERT INTO event_months (eventId, monthId) VALUES (?, ?)')
        for (const e of events) {
          const eventEnd = e.endDate || e.startDate
          if (updatedMonth.startDate <= eventEnd && updatedMonth.endDate >= e.startDate) {
            insEventMonth.run(e.id, req.params.id)
          }
        }
      }
    }
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
    const { subtitle, specialEvents, startDate, endDate } = req.body
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

    const updates = []
    const values = []
    if (subtitle !== undefined) { updates.push('subtitle = ?'); values.push(cleanSubtitle) }
    if (specialEvents !== undefined) { updates.push('specialEvents = ?'); values.push(cleanSpecial) }
    if (startDate !== undefined) { updates.push('startDate = ?'); values.push(startDate) }
    if (endDate !== undefined) { updates.push('endDate = ?'); values.push(endDate) }

    if (updates.length > 0) {
      values.push(req.params.id)
      db.prepare(`UPDATE weeks SET ${updates.join(', ')} WHERE id = ?`).run(...values)

      // Re-place events if dates changed
      if (startDate !== undefined || endDate !== undefined) {
        const updatedWeek = db.prepare('SELECT * FROM weeks WHERE id = ?').get(req.params.id)
        db.prepare('DELETE FROM event_weeks WHERE weekId = ?').run(req.params.id)
        const events = db.prepare('SELECT * FROM events WHERE startDate IS NOT NULL').all()
        const insEventWeek = db.prepare('INSERT INTO event_weeks (eventId, weekId) VALUES (?, ?)')
        for (const e of events) {
          const eventEnd = e.endDate || e.startDate
          if (updatedWeek.startDate <= eventEnd && updatedWeek.endDate >= e.startDate) {
            insEventWeek.run(e.id, req.params.id)
          }
        }
      }
    }
    console.log(`[${new Date().toISOString()}] Week updated: ${req.params.id}`)
    res.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/weeks/:id', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

console.log(`[${new Date().toISOString()}] Route: POST /api/events`)

app.post('/api/events', (req, res) => {
  try {
    const { groupName, headcount, housing, status, startDate, endDate } = req.body
    if (typeof groupName !== 'string' || !groupName.trim()) {
      return res.status(400).json({ error: 'groupName is required' })
    }
    if (groupName.length > 200) {
      return res.status(400).json({ error: 'groupName too long' })
    }
    if (headcount !== undefined && (!Number.isInteger(headcount) || headcount < 0)) {
      return res.status(400).json({ error: 'headcount must be a non-negative integer' })
    }
    if (housing !== undefined) {
      const err1 = stringError(housing, 'housing', MAX_HOUSING)
      if (err1) return res.status(400).json({ error: err1 })
    }
    if (status !== undefined && !EVENT_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${EVENT_STATUSES.join(', ')}` })
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' })
    }

    const eventId = crypto.randomUUID()
    const cleanGroupName = sanitizeHtml(groupName)
    const cleanHousing = sanitizeHtml(housing ?? '')

    db.prepare('INSERT INTO events (id, groupName, headcount, housing, status, origin, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(eventId, cleanGroupName, headcount ?? 0, cleanHousing, status ?? 'pending', 'dashboard', startDate, endDate)

    // Place event in overlapping months and weeks
    placeDashboardEvent(db, eventId, startDate, endDate)

    console.log(`[${new Date().toISOString()}] Event created: ${eventId} (${cleanGroupName})`)
    res.json({ id: eventId })
  } catch (err) {
    console.error('POST /api/events', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

console.log(`[${new Date().toISOString()}] Route: PATCH /api/events/:id`)

app.patch('/api/events/:id', (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id)
    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    // ICS events can only update status
    if (event.origin === 'ics') {
      const { status } = req.body
      if (status && EVENT_STATUSES.includes(status)) {
        db.prepare('UPDATE events SET status = ? WHERE id = ?').run(status, req.params.id)
        console.log(`[${new Date().toISOString()}] ICS event status updated: ${req.params.id} (${status})`)
      }
      return res.json({ ok: true })
    }

    // Dashboard events can update all fields
    const { groupName, headcount, housing, status, startDate, endDate } = req.body
    const sets = []
    const vals = []

    if (groupName !== undefined) {
      if (typeof groupName !== 'string' || !groupName.trim()) {
        return res.status(400).json({ error: 'groupName must be a non-empty string' })
      }
      sets.push('groupName = ?'); vals.push(sanitizeHtml(groupName))
    }
    if (headcount !== undefined) {
      if (!Number.isInteger(headcount) || headcount < 0) {
        return res.status(400).json({ error: 'headcount must be a non-negative integer' })
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
    if (startDate !== undefined) {
      sets.push('startDate = ?'); vals.push(startDate)
    }
    if (endDate !== undefined) {
      sets.push('endDate = ?'); vals.push(endDate)
    }

    if (sets.length === 0) return res.json({ ok: true })
    vals.push(req.params.id)
    db.prepare(`UPDATE events SET ${sets.join(', ')} WHERE id = ?`).run(...vals)

    // Re-place event if dates changed
    if (startDate || endDate) {
      const updatedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id)
      db.prepare('DELETE FROM event_months WHERE eventId = ?').run(req.params.id)
      db.prepare('DELETE FROM event_weeks WHERE eventId = ?').run(req.params.id)
      placeDashboardEvent(db, req.params.id, updatedEvent.startDate, updatedEvent.endDate)
    }

    console.log(`[${new Date().toISOString()}] Event updated: ${req.params.id}`)
    res.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/events/:id', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

console.log(`[${new Date().toISOString()}] Route: DELETE /api/events/:id`)

app.delete('/api/events/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id)
    console.log(`[${new Date().toISOString()}] Event deleted: ${req.params.id}`)
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/events/:id', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

console.log(`[${new Date().toISOString()}] Route: POST /api/sync/ics`)

app.post('/api/sync/ics', async (req, res) => {
  if (!process.env.ICS_URL) {
    console.error(`[${new Date().toISOString()}] POST /api/sync/ics: ICS_URL not configured`)
    return res.status(400).json({ error: 'ICS_URL not configured' })
  }
  try {
    const result = await syncNow(db)
    if (result.status === 'error') {
      console.error(`[${new Date().toISOString()}] POST /api/sync/ics: sync failed - ${result.error}`)
    }
    res.json(result)
  } catch (err) {
    console.error(`[${new Date().toISOString()}] POST /api/sync/ics: ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})

console.log(`[${new Date().toISOString()}] Route: POST /api/reset`)

app.post('/api/reset', (req, res) => {
  try {
    const tx = db.transaction(() => {
      // Delete all events
      db.exec('DELETE FROM events')
      // Clear event placements (cascade will handle this, but be explicit)
      db.exec('DELETE FROM event_months')
      db.exec('DELETE FROM event_weeks')
      // Clear subtitles and specialEvents
      db.exec("UPDATE months SET subtitle = '', specialEvents = ''")
      db.exec("UPDATE weeks SET subtitle = '', specialEvents = ''")

      // Reset startDate/endDate to current rolling window defaults
      const months = db.prepare('SELECT * FROM months ORDER BY id').all()
      for (const m of months) {
        const year = getYearForMonth(m.name)
        const { start, end } = getMonthDates(m.name, year)
        db.prepare('UPDATE months SET startDate = ?, endDate = ? WHERE id = ?').run(start, end, m.id)
      }

      const weeks = db.prepare('SELECT * FROM weeks ORDER BY weekNumber').all()
      const weekYear = getYearForWeeks()
      for (const w of weeks) {
        const { start, end } = getWeekDates(w.weekNumber, weekYear)
        db.prepare('UPDATE weeks SET startDate = ?, endDate = ? WHERE id = ?').run(start, end, w.id)
      }
    })
    tx()
    console.log(`[${new Date().toISOString()}] Database reset: cleared all events, subtitles, specialEvents; reset dates to rolling window defaults`)
    res.json({ ok: true })
  } catch (err) {
    console.error('POST /api/reset', err)
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
      db.exec('DELETE FROM event_months')
      db.exec('DELETE FROM event_weeks')
      db.exec('DELETE FROM events')
      db.exec('DELETE FROM weeks')
      db.exec('DELETE FROM months')

      const insMonth = db.prepare('INSERT INTO months (id, name, startDate, endDate, subtitle, specialEvents) VALUES (?, ?, ?, ?, ?, ?)')
      for (const m of months) {
        const year = getYearForMonth(m.name);
        insMonth.run(
          m.id,
          m.name,
          m.startDate || getMonthDates(m.name, year).start,
          m.endDate || getMonthDates(m.name, year).end,
          sanitizeHtml(m.subtitle || ''),
          sanitizeHtml(m.specialEvents || ''),
        )
      }

      const insWeek = db.prepare('INSERT INTO weeks (id, weekNumber, startDate, endDate, subtitle, specialEvents) VALUES (?, ?, ?, ?, ?, ?)')
      const weekYear = getYearForWeeks();
      const insEv = db.prepare('INSERT INTO events (id, groupName, headcount, housing, status, origin, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      const insEventMonth = db.prepare('INSERT OR IGNORE INTO event_months (eventId, monthId) VALUES (?, ?)')
      const insEventWeek = db.prepare('INSERT OR IGNORE INTO event_weeks (eventId, weekId) VALUES (?, ?)')

      // Collect all unique events first to avoid duplicate inserts
      const uniqueEvents = new Map()
      const eventWeekPairs = []
      for (const w of weeks) {
        insWeek.run(
          w.id,
          w.weekNumber,
          w.startDate || getWeekDates(w.weekNumber, weekYear).start,
          w.endDate || getWeekDates(w.weekNumber, weekYear).end,
          sanitizeHtml(w.subtitle || ''),
          sanitizeHtml(w.specialEvents || '')
        )
        for (const e of w.events || []) {
          if (!uniqueEvents.has(e.id)) {
            uniqueEvents.set(e.id, e)
          }
          eventWeekPairs.push({ eventId: e.id, weekId: w.id })
        }
      }

      // Insert unique events
      for (const e of uniqueEvents.values()) {
        insEv.run(
          e.id,
          sanitizeHtml(e.groupName),
          e.headcount || 0,
          sanitizeHtml(e.housing || ''),
          e.status || 'pending',
          e.origin || 'dashboard',
          e.startDate,
          e.endDate,
        )
      }

      // Place events in weeks and overlapping months
      for (const { eventId, weekId } of eventWeekPairs) {
        insEventWeek.run(eventId, weekId)
        const event = uniqueEvents.get(eventId)
        const eventStart = event.startDate
        const eventEnd = event.endDate
        if (eventStart && eventEnd) {
          const overlappingMonths = db.prepare('SELECT id FROM months WHERE startDate <= ? AND endDate >= ?').all(eventEnd, eventStart)
          for (const { id: monthId } of overlappingMonths) {
            insEventMonth.run(eventId, monthId)
          }
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
  res.status(404).json({ error: 'Not found' })
})

app.use((err, req, res, _next) => {
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
