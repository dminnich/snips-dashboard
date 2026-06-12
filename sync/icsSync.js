const ical = require('node-ical');
const crypto = require('crypto');

const { ICS_SYNC_MINUTES, ICS_URL } = process.env;

let isSyncing = false;

function startIcsSync(db) {
  if (!ICS_URL) {
    console.log(`[${new Date().toISOString()}] ICS sync: ICS_URL not set, skipping`);
    return;
  }

  // Run immediately on startup
  syncNow(db);
  
  // Then run on interval
  const intervalMs = (parseInt(ICS_SYNC_MINUTES) || 60) * 60 * 1000;
  setInterval(() => syncNow(db), intervalMs);
}

async function syncNow(db) {
  if (isSyncing) {
    console.log(`[${new Date().toISOString()}] ICS sync: already in progress, skipping`);
    return { status: 'already_syncing' };
  }

  isSyncing = true;
  const syncStart = new Date().toISOString();
  console.log(`[${syncStart}] ICS sync: starting sync from ${ICS_URL}`);
  
  try {
    const response = await fetch(ICS_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const icsText = await response.text();
    const calData = ical.parseICS(icsText);
    const events = Object.values(calData).filter(e => e.type === 'VEVENT');
    
    console.log(`[${syncStart}] ICS sync: fetched ${events.length} events from ICS`);
    
    let added = 0, updated = 0, skipped = 0;
    const seenUids = new Set();
    
    for (const event of events) {
      const icsUid = event.uid;
      const sequence = event.sequence || 0;
      const icsLastModified = event.lastmodified ? event.lastmodified.toISOString() : null;
      const isDateOnly = event.start?.dateOnly === true;
      const icsStart = toStoredDate(event.start);
      const icsEnd = toStoredEndDate(event.end, isDateOnly);
      const title = event.summary || 'Untitled Event';

      seenUids.add(icsUid);

      const existing = db.prepare('SELECT * FROM events WHERE icsUid = ?').get(icsUid);

      if (existing) {
        const sequenceChanged = sequence > existing.sequence;
        const lastModifiedChanged = icsLastModified !== null && icsLastModified !== existing.lastModified;
        if (sequenceChanged || lastModifiedChanged) {
          db.prepare('UPDATE events SET groupName=?, sequence=?, lastModified=?, lastSeen=?, startDate=?, endDate=? WHERE id=?')
            .run(title, sequence, icsLastModified, syncStart, icsStart, icsEnd, existing.id);

          // Remove old placements, re-add based on new dates
          db.prepare('DELETE FROM event_months WHERE eventId = ?').run(existing.id);
          db.prepare('DELETE FROM event_weeks WHERE eventId = ?').run(existing.id);
          placeDashboardEvent(db, existing.id, icsStart, icsEnd);

          updated++;
          const reason = sequenceChanged
            ? `sequence ${existing.sequence} → ${sequence}`
            : `lastModified changed`;
          console.log(`[${syncStart}] ICS sync: updated event ${icsUid} (${reason})`);
        } else {
          db.prepare('UPDATE events SET lastSeen=? WHERE icsUid=?').run(syncStart, icsUid);
          skipped++;
          console.log(`[${syncStart}] ICS sync: skipped event ${icsUid} - no changes detected`);
        }
      } else {
        const eventId = crypto.randomUUID();
        db.prepare(`INSERT INTO events (id, groupName, headcount, housing, status, origin, icsUid, sequence, lastModified, lastSeen, startDate, endDate)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(eventId, title, 0, '', 'pending', 'ics', icsUid, sequence, icsLastModified, syncStart, icsStart, icsEnd);

        placeDashboardEvent(db, eventId, icsStart, icsEnd);

        added++;
        console.log(`[${syncStart}] ICS sync: added event ${icsUid} "${title}"`);
      }
    }
    
    // Cleanup deleted events
    const { changes: deleted } = db.prepare('DELETE FROM events WHERE origin = ? AND (lastSeen IS NULL OR lastSeen < ?)')
      .run('ics', syncStart);
    
    console.log(`[${syncStart}] ICS sync: completed - added=${added}, updated=${updated}, deleted=${deleted}, skipped=${skipped}`);
    
    return { status: 'success', added, updated, deleted, skipped };
    
  } catch (err) {
    console.error(`[${syncStart}] ICS sync: failed - ${err.message}`);
    return { status: 'error', error: err.message };
  } finally {
    isSyncing = false;
  }
}

// For all-day events (VALUE=DATE), node-ical parses dates as UTC midnight.
// Storing at UTC noon avoids timezone display issues (same pattern as dashboard dates).
function toStoredDate(date) {
  if (!date) return null;
  if (date.dateOnly) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0)).toISOString();
  }
  return date.toISOString();
}

// iCal all-day DTEND is exclusive (Nov 9 means "ends before Nov 9" = Nov 8).
// Subtract 1 day and store at noon UTC to get the inclusive end date.
function toStoredEndDate(date, isDateOnly) {
  if (!date) return null;
  if (isDateOnly) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 1, 12, 0, 0)).toISOString();
  }
  return date.toISOString();
}

function placeDashboardEvent(db, eventId, startDate, endDate) {
  if (!startDate) return;

  const eventEnd = endDate || startDate;

  const months = db.prepare(`
    SELECT id FROM months WHERE startDate <= ? AND endDate >= ?
  `).all(eventEnd, startDate);

  for (const { id: monthId } of months) {
    db.prepare('INSERT OR IGNORE INTO event_months (eventId, monthId) VALUES (?, ?)')
      .run(eventId, monthId);
    console.log(`[${new Date().toISOString()}] Placed event ${eventId} in month ${monthId}`);
  }

  const weeks = db.prepare(`
    SELECT id FROM weeks WHERE startDate <= ? AND endDate >= ?
  `).all(eventEnd, startDate);

  for (const { id: weekId } of weeks) {
    db.prepare('INSERT OR IGNORE INTO event_weeks (eventId, weekId) VALUES (?, ?)')
      .run(eventId, weekId);
    console.log(`[${new Date().toISOString()}] Placed event ${eventId} in week ${weekId}`);
  }
}

module.exports = { startIcsSync, syncNow, placeDashboardEvent };
