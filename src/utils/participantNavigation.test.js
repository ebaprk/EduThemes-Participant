import assert from 'node:assert/strict';
import test from 'node:test';
import { privateLinkDestination } from './participantNavigation.js';
const key='a'.repeat(64),submission='12345678-1234-4567-8901-123456789012',receipt='abcdefab-1234-4567-8901-123456789012';
test('private link shortcuts route study and results links to their matching pages',()=>{
  assert.equal(privateLinkDestination(key),`/my-studies#access=${key}`);
  assert.equal(privateLinkDestination(`https://example.invalid/my-studies#access=${key}`),`/my-studies#access=${key}`);
  assert.equal(privateLinkDestination(`https://example.invalid/results#access=${key}`),`/results#access=${key}`);
  assert.equal(privateLinkDestination(`https://example.invalid/results#submission=${submission}&receipt=${receipt}`),`/results#submission=${submission}&receipt=${receipt}`);
});
test('private shortcuts reject malformed proofs and never navigate to a pasted external host',()=>{
  assert.equal(privateLinkDestination('https://example.invalid/results?access='+key),null);
  assert.equal(privateLinkDestination('#submission='+submission),null);
  assert.equal(privateLinkDestination('a'.repeat(63)),null);
  assert.equal(privateLinkDestination(`#access=${key}&submission=${submission}`),null);
  assert.equal(privateLinkDestination(`#access=${key}&access=${'b'.repeat(64)}`),null);
  assert.ok(privateLinkDestination(`https://other.invalid/my-studies#access=${key}`).startsWith('/my-studies#'));
});
