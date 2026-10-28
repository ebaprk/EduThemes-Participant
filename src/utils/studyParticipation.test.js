import assert from 'node:assert/strict';
import test from 'node:test';
import { readDraft, submissionArguments, usesCanvas } from './studyParticipation.js';

test('anonymous studies stay anonymous even when Canvas is connected', () => {
  assert.equal(usesCanvas({ participant_mode: 'anonymous' }, true), false);
  assert.equal(usesCanvas({ participant_mode: 'canvas' }, false), true);
  assert.equal(usesCanvas({ participant_mode: 'optional_canvas' }, true), true);
  assert.equal(usesCanvas({ participant_mode: 'optional_canvas' }, false), false);
});
test('submission records the displayed version and requires fresh explicit consent', () => {
  const study = { version_id: 'version-2', consent_required: true };
  assert.throws(() => submissionArguments('code', study, {}, false, 'retry'), /accept the study consent/);
  assert.deepEqual(submissionArguments('code', study, { q: 'Answer' }, true, 'retry'), {
    p_code: 'code', p_answers: { q: 'Answer' }, p_version_id: 'version-2', p_consent_accepted: true, p_request_id: 'retry',
  });
  assert.equal(submissionArguments('code', { ...study, consent_required: false }, {}, true, 'retry').p_consent_accepted, false);
});
test('draft restoration only restores answers for this version, never stored consent or identity', () => {
  const storage = { getItem: () => JSON.stringify({ q: 'Saved answer', old: 'Old question', consent: true, name: 'Private' }) };
  assert.deepEqual(readDraft(storage, 'draft', [{ id: 'q' }]), { q: 'Saved answer' });
  assert.throws(() => readDraft({ getItem: () => 'broken json' }, 'draft', []));
});
