export function usesCanvas(study, connected) {
  return study.participant_mode === 'canvas' || (study.participant_mode === 'optional_canvas' && connected);
}

export function submissionArguments(code, study, answers, accepted, requestId) {
  if (!study.version_id) throw new Error('Reload this study to review its current version.');
  if (study.consent_required && !accepted) throw new Error('Review and accept the study consent before submitting.');
  return { p_code: code, p_answers: answers, p_version_id: study.version_id,
    p_consent_accepted: study.consent_required ? accepted === true : false, p_request_id: requestId };
}

export function readDraft(storage, key, questions) {
  const draft = JSON.parse(storage.getItem(key) || '{}');
  return Object.fromEntries(questions.flatMap((question) => typeof draft?.[question.id] === 'string'
    ? [[question.id, draft[question.id].slice(0, 10000)]] : []));
}
