import assert from 'node:assert/strict';
import test from 'node:test';
import { webcrypto } from 'node:crypto';
import { answersFingerprint, forgetStudyLink, persistentStudyLinks, parseStudyKey, pendingStudyKey, privateStudyUrl, readStudyLinks,
  recoverActivityDraft, sessionStudyLinks, storeStudyLink } from './studyHub.js';

function memory() { const values = new Map(); return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) }; }
const key = 'a'.repeat(64);
test('private return links keep capabilities in the fragment and reject incomplete or malformed keys', () => {
  const url = privateStudyUrl('https://example.edu/', key);
  assert.equal(new URL(url).search, ''); assert.equal(parseStudyKey(url), key); assert.equal(parseStudyKey('#access=' + key), key);
  assert.equal(parseStudyKey(key), key); assert.equal(parseStudyKey('https://example.edu/my-studies?access=' + key), null);
  assert.equal(parseStudyKey('a'.repeat(63)), null); assert.equal(parseStudyKey('x'.repeat(64)), null);
  assert.throws(() => privateStudyUrl('https://example.edu', url));
});
test('enrollment retries retain a secure key and keep different studies and versions separate when storage is denied', () => {
  const denied = { getItem() { throw new Error('Denied'); }, setItem() { throw new Error('Denied'); } };
  const first = pendingStudyKey(denied, 'STUDY', 'v1', webcrypto);
  assert.match(first, /^[a-f0-9]{64}$/); assert.equal(pendingStudyKey(denied, 'STUDY', 'v1', webcrypto), first);
  assert.notEqual(pendingStudyKey(denied, 'OTHER', 'v1', webcrypto), first);
  assert.notEqual(pendingStudyKey(denied, 'STUDY', 'v2', webcrypto), first);
});
test('the browser study list retains only return metadata and never answers or participant contact fields', () => {
  const storage = memory();
  storeStudyLink(storage, sessionStudyLinks, { key, title: 'Study', version: 1, reference: 'P-TEST', answers: { q: 'Secret' }, email: 'private@example.com' });
  storeStudyLink(storage, sessionStudyLinks, { key, title: 'Study', version: 1, reference: 'P-TEST' });
  const records = readStudyLinks(storage, sessionStudyLinks); assert.equal(records.length, 1);
  assert.equal(records[0].answers, undefined); assert.equal(records[0].email, undefined);
  assert.throws(() => storeStudyLink(storage, sessionStudyLinks, { key: 'short', title: 'Bad' }));
});
test('local draft recovery never silently overwrites a newer saved draft from another tab or device', () => {
  const storage = memory(), questions = [{ id: 'q' }];
  storage.setItem('draft', JSON.stringify({ base_revision: 3, answers: { q: 'Unsent changes', foreign: 'Discard' } }));
  assert.deepEqual(recoverActivityDraft(storage, 'draft', questions, { q: 'Saved' }, 3), { answers: { q: 'Unsent changes' }, backup: null });
  assert.deepEqual(recoverActivityDraft(storage, 'draft', questions, { q: 'Newer saved draft' }, 4), { answers: { q: 'Newer saved draft' }, backup: { q: 'Unsent changes' } });
  assert.deepEqual(recoverActivityDraft(storage, 'draft', questions, { q: 'Unsent changes' }, 4), { answers: { q: 'Unsent changes' }, backup: null });
  assert.equal(answersFingerprint({ a: 'One', b: 'Two' }), answersFingerprint({ b: 'Two', a: 'One' }));
});

test('forgetting a link clears both browser shortcuts while retaining other studies and answer drafts', () => {
  const session=memory(), persistent=memory(), other='b'.repeat(64);
  for (const [storage,name] of [[session,sessionStudyLinks],[persistent,persistentStudyLinks]]) {
    storeStudyLink(storage,name,{key,title:'First study'});
    storeStudyLink(storage,name,{key:other,title:'Other study'});
    storage.setItem('answer-draft','Keep my answers');
  }
  forgetStudyLink(session,persistent,key);
  assert.deepEqual(readStudyLinks(session,sessionStudyLinks).map(item=>item.key),[other]);
  assert.deepEqual(readStudyLinks(persistent,persistentStudyLinks).map(item=>item.key),[other]);
  assert.equal(session.getItem('answer-draft'),'Keep my answers');
  assert.equal(persistent.getItem('answer-draft'),'Keep my answers');
});
test('forgetting reports a blocked browser store and still removes the accessible shortcut', () => {
  const session=memory(), denied={getItem(){throw new Error('Denied');},setItem(){throw new Error('Denied');}};
  storeStudyLink(session,sessionStudyLinks,{key,title:'Study'});
  assert.throws(()=>forgetStudyLink(session,denied,key),/could not remove every saved copy/);
  assert.equal(readStudyLinks(session,sessionStudyLinks).length,0);
});
