import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeCanvas, submitCanvasStudy, submissionRequestId, clearSubmissionRequestId } from './canvas.js';

function browser() {
  const storage = new Map();
  const history = [];
  globalThis.window = {
    location: { pathname: '/canvas', hash: '#code=one-time-code' },
    history: { replaceState: (...args) => history.push(args) },
    sessionStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  };
  return { storage, history };
}

test('double initialization exchanges a one-time code only once and clears the fragment', async () => {
  const { storage, history } = browser();
  storage.set('eduthemes.canvas.session', 'previous-person');
  let exchanges = 0;
  globalThis.fetch = async (_url, options) => {
    exchanges += 1;
    assert.equal(storage.has('eduthemes.canvas.session'), false);
    assert.equal(options.credentials, 'omit');
    assert.deepEqual(JSON.parse(options.body), { code: 'one-time-code' });
    return { ok: true, status: 200, json: async () => ({ access_token: 'verified-token', participant: { name: 'Alex' } }) };
  };
  assert.strictEqual(initializeCanvas(), initializeCanvas());
  assert.deepEqual(await initializeCanvas(), { name: 'Alex' });
  assert.equal(exchanges, 1);
  assert.deepEqual(history, [[null, '', '/canvas']]);
  assert.equal(storage.get('eduthemes.canvas.session'), 'verified-token');
});

test('submission includes a stable retry ID and sharing confirmation but no editable identity', async () => {
  browser();
  window.sessionStorage.setItem('eduthemes.canvas.session', 'verified-token');
  const request = submissionRequestId('ABCDEF123456');
  assert.equal(submissionRequestId('ABCDEF123456'), request);
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer verified-token');
    assert.deepEqual(JSON.parse(options.body), {
      code: 'ABCDEF123456', answers: { q: 'Answer' }, request_id: request, share_participant_details: true,
    });
    return { ok: true, status: 201, json: async () => ({ submission_id: 'saved' }) };
  };
  assert.deepEqual(await submitCanvasStudy('ABCDEF123456', { q: 'Answer' }, request), { submission_id: 'saved' });
  clearSubmissionRequestId('ABCDEF123456');
  assert.notEqual(submissionRequestId('ABCDEF123456'), request);
});

test('missing and expired Canvas sessions never fall back to anonymous submission', async () => {
  browser();
  assert.throws(() => submitCanvasStudy('ABCDEF123456', {}, 'request'), /missing/);
  window.sessionStorage.setItem('eduthemes.canvas.session', 'expired');
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: 'Session expired' }) });
  await assert.rejects(submitCanvasStudy('ABCDEF123456', { q: 'Answer' }, 'request'), /Session expired/);
});

test('versioned Canvas submissions carry consent independently of identity sharing', async () => {
  browser();
  window.sessionStorage.setItem('eduthemes.canvas.session', 'token');
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.version_id, 'version-2');
    assert.equal(body.consent_accepted, true);
    assert.equal(body.share_participant_details, true);
    return { ok: true, status: 201, json: async () => ({ submission_id: 'saved' }) };
  };
  await submitCanvasStudy('ABCDEF123456', { q: 'Answer' }, 'request', { versionId: 'version-2', accepted: true });
  assert.notEqual(submissionRequestId('ABCDEF123456', 'v1'), submissionRequestId('ABCDEF123456', 'v2'));
});

test('network failures retain the request ID so retry does not duplicate the response', async () => {
  browser();
  window.sessionStorage.setItem('eduthemes.canvas.session', 'token');
  const id = submissionRequestId('ABCDEF123456');
  globalThis.fetch = async () => { throw new Error('Network lost'); };
  await assert.rejects(submitCanvasStudy('ABCDEF123456', { q: 'Answer' }, id), /try again/);
  assert.equal(submissionRequestId('ABCDEF123456'), id);
});

test('refreshing the Canvas landing page restores the session after its fragment was cleared', async () => {
  browser();
  window.location.hash = '';
  window.sessionStorage.setItem('eduthemes.canvas.session', 'existing-session');
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith('/session'));
    assert.equal(options.headers.Authorization, 'Bearer existing-session');
    return { ok: true, status: 200, json: async () => ({ participant: { name: 'Restored student' } }) };
  };
  const fresh = await import('./canvas.js?refresh-test');
  assert.deepEqual(await fresh.initializeCanvas(), { name: 'Restored student' });
  assert.equal(window.sessionStorage.getItem('eduthemes.canvas.session'), 'existing-session');
});

test('retry IDs survive denied browser storage and remain separate for different participant contexts', () => {
  browser();
  window.sessionStorage.getItem = () => { throw new Error('Storage denied'); };
  const first = submissionRequestId('BLOCKED', 'v1', 'anonymous');
  assert.equal(submissionRequestId('BLOCKED', 'v1', 'anonymous'), first);
  assert.notEqual(submissionRequestId('BLOCKED', 'v1', 'canvas'), first);
});
