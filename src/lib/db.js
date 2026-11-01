// IndexedDB wrapper with localStorage fallback.
// Single store ('kv') holds all app state under well-known keys.
//
// Keys:
//   workouts     -> array of finished Workout objects
//   active       -> in-progress workout or null
//   prefs        -> { bodyKg, soundOn, lastRoutineId, lastVariant: {slotKey: 'primary'|'alt'}, lastBackupAt, allDumbbell }
//   rotationPos  -> last finished routine id (so next = after it)
//
// This module is intentionally thin: components use it directly via store APIs.

const DB_NAME = 'gymtrax';
const STORE = 'kv';
const LS_PREFIX = 'gymtrax.kv.';

let _db = null;
let _idbReady = null;

function openIDB() {
  if (_idbReady) return _idbReady;
  _idbReady = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => { _db = req.result; resolve(_db); };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return _idbReady;
}

async function idbGet(key) {
  const db = await openIDB();
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    } catch { resolve(undefined); }
  });
}

async function idbSet(key, value) {
  const db = await openIDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch { resolve(false); }
  });
}

export async function kvGet(key, fallback) {
  const v = await idbGet(key);
  if (v !== undefined) return v;
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw != null) return JSON.parse(raw);
  } catch {}
  return fallback;
}

export async function kvSet(key, value) {
  await idbSet(key, value);
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch {}
}

// ---------------- App state helpers ----------------

export const DEFAULT_PREFS = {
  bodyKg: 75,
  soundOn: true,
  weeklyGoal: 4,
  lastVariant: {},  // { slotKey: 'primary'|'alt' }
  allDumbbell: false,
  lastBackupAt: null,
};

export async function getPrefs() {
  const p = await kvGet('prefs', {});
  return { ...DEFAULT_PREFS, ...p };
}
export async function setPrefs(update) {
  const cur = await getPrefs();
  const next = typeof update === 'function' ? update(cur) : { ...cur, ...update };
  await kvSet('prefs', next);
  return next;
}

export async function getWorkouts() { return (await kvGet('workouts', [])) || []; }
export async function setWorkouts(list) { await kvSet('workouts', list); }
export async function addWorkout(w) {
  const list = await getWorkouts();
  list.unshift(w);
  await setWorkouts(list);
}
export async function updateWorkout(id, patch) {
  const list = await getWorkouts();
  const i = list.findIndex(w => w.id === id);
  if (i >= 0) {
    list[i] = { ...list[i], ...patch };
    await setWorkouts(list);
  }
}
export async function deleteWorkout(id) {
  const list = (await getWorkouts()).filter(w => w.id !== id);
  await setWorkouts(list);
}

export async function getActive() { return await kvGet('active', null); }
export async function setActive(w) { await kvSet('active', w); }
export async function clearActive() { await kvSet('active', null); }

export async function getRotationPos() { return await kvGet('rotationPos', null); }
export async function setRotationPos(routineId) { await kvSet('rotationPos', routineId); }

// Export full snapshot for backup
export async function exportAll() {
  return {
    schema: 'gymtrax.v2',
    exportedAt: new Date().toISOString(),
    workouts: await getWorkouts(),
    prefs: await getPrefs(),
    rotationPos: await getRotationPos(),
  };
}
