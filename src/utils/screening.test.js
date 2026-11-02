import assert from 'node:assert/strict';
import test from 'node:test';
import { visibleScreeningAnswers,visibleScreeningQuestions } from './screening.js';
const questions=[{id:'a',options:[{id:'yes'},{id:'no'}]},{id:'b',show_if:{question_id:'a',option_id:'yes'},options:[{id:'online'},{id:'campus'}]},{id:'c',show_if:{question_id:'b',option_id:'online'},options:[{id:'text'},{id:'video'}]}];
test('changing a parent clears hidden descendants and prevents stale values from reopening nested branches',()=>{
 const answers={a:'no',b:'online',c:'text'};
 assert.deepEqual(visibleScreeningQuestions(questions,answers).map(q=>q.id),['a']);
 assert.deepEqual(visibleScreeningAnswers(questions,answers),{a:'no'});
 assert.deepEqual(visibleScreeningQuestions(questions,{a:'yes',b:'online'}).map(q=>q.id),['a','b','c']);
});
test('unknown choices and extra fields never enter a screening submission',()=>{
 assert.deepEqual(visibleScreeningAnswers(questions,{a:'yes',b:'invalid',c:'text',extra:'secret'}),{a:'yes'});
});
