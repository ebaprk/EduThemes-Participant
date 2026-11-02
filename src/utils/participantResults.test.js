import assert from 'node:assert/strict';
import test from 'node:test';
import { parseResultsLink, privateResultsPath, resultsCredentials, participantResultsText } from './participantResults.js';
const id='12345678-1234-4567-8901-123456789012',request='abcdefab-1234-4567-8901-123456789012';
test('private results links retain credentials only in URL fragments',()=>{
 for(const args of [{p_access_key:'a'.repeat(64)},{p_submission_id:id,p_request_id:request}]) {
  const path=privateResultsPath(args);assert.equal(path.split('#')[0],'/results');assert.deepEqual(parseResultsLink(`https://example.invalid${path}`),args);
 }
 assert.deepEqual(parseResultsLink(`https://example.invalid/my-studies#access=${'a'.repeat(64)}`),{p_access_key:'a'.repeat(64)});
});
test('incomplete, mixed and duplicate credentials are rejected',()=>{
 for(const link of [`#submission=${id}`,`#access=${'a'.repeat(64)}&submission=${id}&receipt=${request}`,`#access=${'a'.repeat(64)}&access=${'b'.repeat(64)}`,`https://example.invalid/results?access=${'a'.repeat(64)}`])assert.equal(parseResultsLink(link),null);
 assert.equal(resultsCredentials({p_submission_id:id}),null);assert.throws(()=>privateResultsPath({p_access_key:'no'}));
});
test('results downloads contain only released summary sections',()=>{
 const text=participantResultsText({study_title:'Study',version_number:1,release:{release_number:2,released_at:'2026-11-02',content:{title:'Summary',findings:'One reviewed result.',answers:'PRIVATE'}},access:'SECRET',draft:'DRAFT'});
 assert.match(text,/One reviewed result/);assert.match(text,/Results release 2/);assert.doesNotMatch(text,/PRIVATE|SECRET|DRAFT/);assert.equal(participantResultsText({release:null}),'');
});
