const TOKEN_KEY = 'eduthemes.canvas.session';
const API_URL = (import.meta.env?.VITE_API_URL || (typeof process !== 'undefined' ? process.env.VITE_API_URL : '') || '').replace(/\/+$/, '');

export function canvasToken() {
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export async function canvasRequest(path, { token, body, method = 'GET' } = {}) {
  if (!API_URL) throw new Error('Canvas connection is not configured on this site. Contact your researcher.');
  let response;
  try {
    response = await fetch(`${API_URL}/lti${path}`, {
      method, credentials: 'omit', cache: 'no-store',
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error('Could not reach the Canvas connection. Your answers have not been cleared. Please try again.');
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error || 'Canvas connection failed. Please try again.');
    error.status = response.status;
    throw error;
  }
  return data;
}

// React Strict Mode mounts effects twice. A handoff must be exchanged only once.
let initialization;
export function initializeCanvas() {
  if (!initialization) initialization = restoreCanvas();
  return initialization;
}

async function restoreCanvas() {
  const code = window.location.pathname === '/canvas'
    ? new URLSearchParams(window.location.hash.slice(1)).get('code') : null;
  if (code) {
    window.history.replaceState(null, '', '/canvas');
    window.sessionStorage.removeItem(TOKEN_KEY);
    const data = await canvasRequest('/exchange', { method: 'POST', body: { code } });
    if (!data?.access_token || !data?.participant) throw new Error('Canvas returned an incomplete session. Launch again from Canvas.');
    try { window.sessionStorage.setItem(TOKEN_KEY, data.access_token); }
    catch { throw new Error('Allow session storage in this browser, then open EduThemes from Canvas again.'); }
    return data.participant;
  }
  const token = canvasToken();
  if (!token && window.location.pathname === '/canvas') throw new Error('Open EduThemes from your Canvas course to connect your details.');
  return token ? (await canvasRequest('/session', { token })).participant : null;
}

export async function disconnectCanvas() {
  const token = canvasToken();
  if (token) await canvasRequest('/session', { token, method: 'DELETE' });
  window.sessionStorage.removeItem(TOKEN_KEY);
  initialization = Promise.resolve(null);
}

export function submitCanvasStudy(code, answers, requestId) {
  const token = canvasToken();
  if (!token) throw new Error('Your Canvas connection is missing. Open EduThemes from Canvas again.');
  return canvasRequest('/submit', {
    method: 'POST', token,
    body: { code, answers, request_id: requestId, share_participant_details: true },
  });
}

export function submissionRequestId(code) {
  const key = `eduthemes.canvas.submission.${code}`;
  let id = window.sessionStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); window.sessionStorage.setItem(key, id); }
  return id;
}

export function clearSubmissionRequestId(code) {
  window.sessionStorage.removeItem(`eduthemes.canvas.submission.${code}`);
}

export const canvasFields = [
  ['name', 'Name'], ['given_name', 'First name'], ['family_name', 'Last name'],
  ['email', 'Email'], ['academic_year', 'Academic year'], ['major', 'Major'],
  ['locale', 'Language'], ['course_name', 'Course'], ['course_code', 'Course code'],
  ['canvas_user_id', 'Canvas user ID'], ['canvas_course_id', 'Canvas course ID'],
  ['course_context_id', 'Course context ID'], ['roles', 'Canvas roles'],
  ['issuer', 'Canvas issuer'], ['client_id', 'Canvas client ID'],
  ['deployment_id', 'Canvas deployment ID'], ['subject', 'Canvas subject'],
  ['verified_at', 'Canvas verified at'],
];
