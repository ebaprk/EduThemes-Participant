import { parseStudyKey } from './studyHub.js';
import { parseResultsLink, privateResultsPath } from './participantResults.js';

// Navigate only within this app. Private credentials remain in a URL fragment.
export function privateLinkDestination(input) {
  const value = String(input || '').trim();
  const results = parseResultsLink(value);
  if (results?.p_submission_id) return privateResultsPath(results);
  try {
    const hash = value.startsWith('#') ? value.slice(1) : new URL(value).hash.slice(1);
    const params = new URLSearchParams(hash);
    if (params.has('submission') || params.has('receipt') || params.getAll('access').length !== 1) return null;
  } catch { /* A raw study key has no URL fragment. */ }
  const key = parseStudyKey(value);
  if (!key) return null;
  try {
    if (new URL(value).pathname.replace(/\/$/, '') === '/results') return privateResultsPath({ p_access_key:key });
  } catch { /* A raw study key is supported as well as a full return link. */ }
  return `/my-studies#access=${key}`;
}
