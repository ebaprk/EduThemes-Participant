export const sessionStudyLinks = 'eduthemes.study-links.session.v1';
export const persistentStudyLinks = 'eduthemes.study-links.remembered.v1';
const pendingKeys = new Map();

export function browserStorage(area) {
  return { getItem: (key) => window[area].getItem(key), setItem: (key, value) => window[area].setItem(key, value), removeItem: (key) => window[area].removeItem(key) };
}

export function parseStudyKey(input) {
  const text = String(input || '').trim();
  if (/^[a-f0-9]{64}$/.test(text)) return text;
  try {
    const hash = text.startsWith('#') ? text.slice(1) : new URL(text).hash.slice(1);
    const value = new URLSearchParams(hash).get('access');
    return /^[a-f0-9]{64}$/.test(value || '') ? value : null;
  } catch { return null; }
}

export function privateStudyUrl(origin, key) {
  if (parseStudyKey(key) !== key) throw new Error('A valid private study key is required.');
  return `${origin.replace(/\/$/, '')}/my-studies#access=${key}`;
}

export function pendingStudyKey(storage, code, version, cryptoSource = globalThis.crypto) {
  const name = `eduthemes.pending-enrollment.${code}.${version}`;
  let key = pendingKeys.get(name);
  try { key ||= parseStudyKey(storage.getItem(name)); } catch { /* Memory preserves retries if storage is denied. */ }
  if (!key) key = Array.from(cryptoSource.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  pendingKeys.set(name, key);
  try { storage.setItem(name, key); } catch { /* The private link can still be copied or downloaded. */ }
  return key;
}

export function readStudyLinks(storage, name) {
  try {
    const records = JSON.parse(storage.getItem(name) || '[]');
    return Array.isArray(records) ? records.filter((record) => parseStudyKey(record.key) === record.key && typeof record.title === 'string').slice(0, 50) : [];
  } catch { return []; }
}

export function storeStudyLink(storage, name, record) {
  if (parseStudyKey(record.key) !== record.key) throw new Error('The private study key is invalid.');
  const records = readStudyLinks(storage, name).filter((item) => item.key !== record.key);
  storage.setItem(name, JSON.stringify([{ key: record.key, title: record.title, version: record.version,
    reference: record.reference }, ...records].slice(0, 50)));
}

export function removeStudyLink(storage, name, key) {
  storage.setItem(name, JSON.stringify(readStudyLinks(storage, name).filter((item) => item.key !== key)));
}

export function recoverActivityDraft(storage, name, questions, serverAnswers, revision) {
  try {
    const stored = JSON.parse(storage.getItem(name) || 'null');
    if (!stored?.answers || typeof stored.answers !== 'object') return { answers: serverAnswers, backup: null };
    const answers = Object.fromEntries(questions.flatMap((question) => typeof stored.answers[question.id] === 'string'
      ? [[question.id, stored.answers[question.id].slice(0, 10000)]] : []));
    if (stored.base_revision === revision) return { answers, backup: null };
    return { answers: serverAnswers, backup: answersFingerprint(answers) === answersFingerprint(serverAnswers) ? null : answers };
  } catch { return { answers: serverAnswers, backup: null }; }
}

export function answersFingerprint(answers) {
  return JSON.stringify(Object.fromEntries(Object.keys(answers).sort().map((key) => [key, answers[key]])));
}
