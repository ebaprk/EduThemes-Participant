import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { submissionRequestId } from '../utils/canvas';
import { answersFingerprint, browserStorage, recoverActivityDraft } from '../utils/studyHub';
import LoadingSkeleton, { Skeleton } from './LoadingSkeleton';

export default function StudyActivityForm({ accessKey, study, activity, progress, onBack, onDone }) {
  const localKey = `eduthemes.activity-draft.${accessKey.slice(-16)}.${activity.id}`;
  const [recovered] = useState(() => recoverActivityDraft(browserStorage('sessionStorage'), localKey, activity.questions, progress.draft_answers, progress.revision));
  const [answers, setAnswers] = useState(recovered.answers);
  const [backup, setBackup] = useState(recovered.backup);
  const [accepted, setAccepted] = useState(false);
  const [consented, setConsented] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const revision = useRef(progress.revision);
  const queue = useRef(Promise.resolve());
  const latestAnswers = useRef(answers);
  const lastSaved = useRef(answersFingerprint(progress.draft_answers));
  const blocked = useRef(false);
  const alive = useRef(true);
  const saveCount = useRef(0);
  latestAnswers.current = answers;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const persistLocal = (snapshot) => {
    try { window.sessionStorage.setItem(localKey, JSON.stringify({ answers: snapshot, base_revision: revision.current })); }
    catch { if (alive.current) setStorageWarning(true); }
  };
  const save = (snapshot) => {
    const fingerprint = answersFingerprint(snapshot);
    const run = queue.current.catch(() => {}).then(async () => {
      if (blocked.current) throw new Error('A newer saved draft exists. Download your answers before reopening this activity.');
      if (fingerprint === lastSaved.current) return;
      if (alive.current) { setSaving(true); setSaveError(''); }
      saveCount.current += 1;
      try {
        const { data, error: failure } = await supabase.rpc('save_activity_draft', {
          p_access_key: accessKey, p_activity_id: activity.id, p_answers: snapshot, p_expected_revision: revision.current,
        });
        if (failure) throw failure;
        revision.current = data; lastSaved.current = fingerprint; persistLocal(latestAnswers.current);
      } catch (failure) {
        if (failure.code === 'PT409') blocked.current = true;
        if (alive.current) setSaveError(failure.message || 'Could not save this draft. Your answers remain here.');
        throw failure;
      } finally { saveCount.current -= 1; if (alive.current && !saveCount.current) setSaving(false); }
    });
    queue.current = run;
    return run;
  };

  useEffect(() => {
    if (!consented || backup || submitting) return undefined;
    persistLocal(answers);
    if (answersFingerprint(answers) === lastSaved.current) return undefined;
    const timer = window.setTimeout(() => { save(answers).catch(() => {}); }, 800);
    return () => window.clearTimeout(timer);
  }, [answers, consented, backup, submitting]);
  useEffect(() => {
    const warn = (event) => {
      if (answersFingerprint(latestAnswers.current) !== lastSaved.current || saveCount.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const download = (snapshot = answers) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ study: study.title, version: study.version_number, activity: activity.title,
      questions: activity.questions, answers: snapshot }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'eduthemes-unfinished-activity.json'; link.click(); URL.revokeObjectURL(url);
  };
  const back = async () => {
    if (backup || blocked.current) { onBack(); return; }
    setLeaving(true); setError('');
    try { if (consented) await save(answers); onBack(); }
    catch { setError('Your activity could not be saved. Download your answers or retry before leaving.'); }
    finally { if (alive.current) setLeaving(false); }
  };
  const submit = async (event) => {
    event.preventDefault(); if (submitting || !consented || backup) return;
    setSubmitting(true); setError('');
    try {
      await save(answers);
      const { error: failure } = await supabase.rpc('submit_study_activity', {
        p_access_key: accessKey, p_activity_id: activity.id, p_answers: answers, p_consent_accepted: true,
        p_request_id: submissionRequestId('activity', study.version_id, `${accessKey.slice(-16)}.${activity.id}`),
      });
      if (failure) throw failure;
      lastSaved.current = answersFingerprint(answers);
      try { window.sessionStorage.removeItem(localKey); } catch { /* Submission is already recorded. */ }
      await onDone();
    } catch (failure) { if (alive.current) setError(failure.message || 'Could not submit. Your answers are still here.'); }
    finally { if (alive.current) setSubmitting(false); }
  };
  return <section className="study-panel participant-activity-form">
    <span className="study-eyebrow">{activity.required ? 'Required activity' : 'Optional activity'}</span><h2>{activity.title}</h2>
    {activity.instructions && <p className="study-preserve-copy">{activity.instructions}</p>}
    {!consented ? <><h3>Review your study consent</h3><p>You are completing version {study.version_number}. Confirm the consent again before continuing this activity.</p><div className="study-consent-copy">{study.consent_text}</div>
      <form onSubmit={(event) => { event.preventDefault(); if (accepted) setConsented(true); }}><label className="study-consent-choice"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required /> I have read the information and agree to participate in this activity.</label><div className="study-actions"><button type="submit" className="study-primary" disabled={!accepted}>Agree and continue</button><button type="button" className="study-text-button" onClick={onBack}>Back to activities</button></div></form>
    </> : <>
      {backup && <div className="study-note"><p>This browser has an unsaved copy based on an older draft. The newer saved draft is shown below. Download the older copy if you need it before continuing.</p><div className="study-actions"><button type="button" className="study-secondary" onClick={() => download(backup)}>Download the older copy</button><button type="button" className="study-text-button" onClick={() => setBackup(null)}>Continue with the saved draft</button></div></div>}
      {storageWarning && <p className="study-note" role="status">This browser cannot keep a local backup. Wait for “Draft saved” before leaving.</p>}
      {saveError && <div className="study-error" role="alert"><p>{saveError}</p><div className="study-actions"><button type="button" className="study-secondary" onClick={() => download()}>Download unfinished answers</button>{!blocked.current && <button type="button" className="study-text-button" disabled={saving} onClick={() => save(answers).catch(() => {})}>Retry saving</button>}</div></div>}
      {error && <p className="study-error" role="alert">{error}</p>}
      <form onSubmit={submit}><fieldset className="participant-fields" disabled={submitting || leaving || Boolean(backup)} hidden={submitting}>
        {activity.questions.map((question, index) => <div className="study-field" key={question.id}><label htmlFor={`activity-answer-${question.id}`}>{index + 1}. {question.prompt}</label><textarea id={`activity-answer-${question.id}`} value={answers[question.id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} rows={5} maxLength={10000} required /></div>)}
      </fieldset>
        {submitting ? <LoadingSkeleton variant="connection" label="Submitting this activity and preparing your receipt…" /> : saving || leaving || (!saveError && answersFingerprint(answers) !== lastSaved.current) ? <LoadingSkeleton variant="inline" label={leaving ? 'Saving before returning to your activities…' : saving ? 'Saving your draft…' : 'Preparing to save your draft…'} /> : <p className="study-help" role="status">{saveError ? 'Your answers remain in this browser. Resolve the save error before leaving.' : 'Draft saved'}</p>}
        <div className="study-actions"><button type="submit" className="study-primary" disabled={submitting || leaving || Boolean(backup) || blocked.current} aria-busy={submitting}>{submitting ? <><Skeleton className="edu-skeleton--button" />Submitting…</> : 'Submit this activity'}</button><button type="button" className="study-text-button" disabled={submitting || leaving} onClick={back} aria-busy={leaving}>{leaving && <Skeleton className="edu-skeleton--button" />}{blocked.current ? 'Return to saved activities' : 'Back to activities'}</button></div>
      </form>
    </>}
  </section>;
}
