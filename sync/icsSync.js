const ical = require('node-ical');
const crypto = require('crypto');

const { ICS_SYNC_MINUTES, ICS_URL } = process.env;

let isSyncing = false;

function getSyncStatus() {
  return { isSyncing };
}

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
    const calData = ical.parse(icsText);
    const events = Object.values(calData).filter(e => e.type === 'VEVENT');
    
    console.log(`[${syncStart}] ICS sync: fetched ${events.length} events from ICS`);
    
    let added = 0, updated = 0, skipped = 0;
    const seenUids = new Set();
    
    for (const event of events) {
      const icsUid = event.uid;
      const sequence = event.sequence || 0;
      const icsStart = event.start ? event.start.toISOString() : null;
      const icsEnd = event.end ? event.end.toISOString() : null;
      const title = event.summary || 'Untitled Event';
      
      seenUids.add(icsUid);
      
      const existing = db.prepare('SELECT * FROM events WHERE icsUid = ?').get(icsUid);
      
      if (existing) {
        if (sequence > existing.sequence) {
          db.prepare('UPDATE events SET groupName=?, sequence=?, lastSeen=?, startDate=?, endDate=? WHERE id=?')
            .run(title, sequence, syncStart, icsStart, icsEnd, existing.id);
          
          // Remove old placements, re-add based on new dates
          db.prepare('DELETE FROM event_months WHERE eventId = ?').run(existing.id);
          db.prepare('DELETE FROM event_weeks WHERE eventId = ?').run(existing.id);
          placeEvent(db, existing.id, icsStart, icsEnd);
          
          updated++;
          console.log(`[${syncStart}] ICS sync: updated event ${icsUid} (sequence ${existing.sequence} → ${sequence})`);
        } else {
          db.prepare('UPDATE events SET lastSeen=? WHERE icsUid=?').run(syncStart, icsUid);
          skipped++;
          console.log(`[${syncStart}] ICS sync: skipped event ${icsUid} - sequence unchanged (${sequence})`);
        }
      } else {
        const eventId = crypto.randomUUID();
        db.prepare(`INSERT INTO events (id, groupName, headcount, housing, status, origin, icsUid, sequence, lastSeen, startDate, endDate) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(eventId, title, 0, '', 'pending', 'ics', icsUid, sequence, syncStart, icsStart, icsEnd);
        
        placeEvent(db, eventId, icsStart, icsEnd);
        
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

function placeEvent(db, eventId, startDate, endDate) {
  if (!startDate) return;
  
  const eventEnd = endDate || startDate;
  
  // Find overlapping months
  const months = db.prepare(`
    SELECT id FROM months WHERE startDate <= ? AND endDate >= ?
  `).all(eventEnd, startDate);
  
  for (const { id: monthId } of months) {
    db.prepare('INSERT OR IGNORE INTO event_months (eventId, monthId) VALUES (?, ?)')
      .run(eventId, monthId);
    console.log(`[${new Date().toISOString()}] ICS sync: placed event in month ${monthId}`);
  }
  
  // Find overlapping weeks
  const weeks = db.prepare(`
    SELECT id FROM weeks WHERE startDate <= ? AND endDate >= ?
  `).all(eventEnd, startDate);
  
  for (const { id: weekId } of weeks) {
    db.prepare('INSERT OR IGNORE INTO event_weeks (eventId, weekId) VALUES (?, ?)')
      .run(eventId, weekId);
    console.log(`[${new Date().toISOString()}] ICS sync: placed event in week ${weekId}`);
  }
}

function placeDashboardEvent(db, eventId, startDate, endDate) {
  // Find overlapping months
  const months = db.prepare(`
    SELECT id FROM months WHERE startDate <= ? AND endDate >= ?
  `).all(endDate, startDate);
  
  for (const { id: monthId } of months) {
    db.prepare('INSERT OR IGNORE INTO event_months (eventId, monthId) VALUES (?, ?)')
      .run(eventId, monthId);
  }
  
  // Find overlapping weeks
  const weeks = db.prepare(`
    SELECT id FROM weeks WHERE startDate <= ? AND endDate >= ?
  `).all(endDate, startDate);
  
  for (const { id: weekId } of weeks) {
    db.prepare('INSERT OR IGNORE INTO event_weeks (eventId, weekId) VALUES (?, ?)')
      .run(eventId, weekId);
  }
}

module.exports = { startIcsSync, syncNow, placeDashboardEvent };
