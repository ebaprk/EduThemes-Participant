import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase, supabaseConfigured } from '../supabase';
import CanvasConnection, { useCanvas } from './CanvasConnection';
import { canvasToken, submissionRequestId, submitCanvasStudy } from '../utils/canvas';
import { readDraft, submissionArguments, usesCanvas } from '../utils/studyParticipation';
import LoadingSkeleton, { Skeleton } from './LoadingSkeleton';
import JoinActivityPlan from './JoinActivityPlan';
import './Studies.css';

export default function Participant() {
  const { code } = useParams();
  const navigate = useNavigate();
  const canvas = useCanvas();
  const [shareDetails, setShareDetails] = useState(false);
  const [entryCode, setEntryCode] = useState('');
  const [study, setStudy] = useState(null);
  const [answers, setAnswers] = useState({});
  const [accepted, setAccepted] = useState(false);
  const [consented, setConsented] = useState(false);
  const [loading, setLoading] = useState(Boolean(code));
  const [resolvedCode, setResolvedCode] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const [loadedDraftKey, setLoadedDraftKey] = useState(null);
  const withCanvas = study ? usesCanvas(study, Boolean(canvas.participant || canvas.error || canvasToken())) : false;
  const draftKey = study ? `eduthemes.draft.${code}.${study.version_id}.${withCanvas ? `canvas-${canvasToken()?.slice(-12) || 'pending'}` : 'anonymous'}` : null;
  const receiptKey = draftKey ? `${draftKey}.receipt` : null;
  const multiActivity = Boolean(study?.activities?.length > 1);
  const preparingStudy = loading || resolvedCode !== code || Boolean(study && !multiActivity && (canvas.loading || loadedDraftKey !== draftKey));

  useEffect(() => {
    setAnswers({}); setFinished(false); setReceipt(null); setAccepted(false); setConsented(false);
    setShareDetails(false); setLoadedDraftKey(null); setStudy(null);
    if (!code || !supabase) { setLoading(false); return undefined; }
    let active = true;
    setLoading(true); setError('');
    supabase.rpc('get_public_study', { p_code: code }).then(({ data, error: loadError }) => {
      if (!active) return;
      setResolvedCode(code); setLoading(false);
      if (loadError) setError(loadError.message);
      else if (!data) setError('This study link is unavailable or the study is closed.');
      else setStudy(data);
    });
    return () => { active = false; };
  }, [code]);
  useEffect(() => { setShareDetails(false); }, [canvas.participant]);
  useEffect(() => {
    if (!study || multiActivity || !draftKey || canvas.loading) return;
    try {
      setAnswers(readDraft(window.sessionStorage, draftKey, study.questions));
      const savedReceipt = JSON.parse(window.sessionStorage.getItem(receiptKey) || 'null');
      setReceipt(savedReceipt); setFinished(Boolean(savedReceipt));
    } catch { setStorageWarning(true); setAnswers({}); }
    setLoadedDraftKey(draftKey);
  }, [draftKey, canvas.loading, study, receiptKey, multiActivity]);
  useEffect(() => {
    if (!draftKey || loadedDraftKey !== draftKey || finished) return;
    try { window.sessionStorage.setItem(draftKey, JSON.stringify(answers)); }
    catch { setStorageWarning(true); }
  }, [answers, draftKey, loadedDraftKey, finished]);

  const submit = async (event) => {
    event.preventDefault();
    if (!study || submitting || (withCanvas && (canvas.loading || canvas.error))) return;
    setError(''); setSubmitting(true);
    try {
      const requestId = submissionRequestId(code, study.version_id, draftKey);
      const args = submissionArguments(code, study, answers, consented, requestId);
      let submissionId;
      if (withCanvas) {
        if (!canvas.participant || !shareDetails) throw new Error('Connect through Canvas and confirm sharing your details before submitting.');
        const result = await submitCanvasStudy(code, answers, requestId, { versionId: study.version_id, accepted: args.p_consent_accepted });
        submissionId = result.submission_id;
      } else {
        const { data, error: submitError } = await supabase.rpc('submit_study_version', args);
        if (submitError) throw submitError;
        submissionId = data;
      }
      // Saving has succeeded even if receipt retrieval or browser storage fails.
      let savedReceipt = { submission_id: submissionId, title: study.title, version_id: study.version_id,
        version_number: study.version_number, consent_text: study.consent_text };
      try {
        const { data } = await supabase.rpc('get_study_receipt', { p_submission_id: submissionId, p_request_id: requestId });
        if (data) savedReceipt = data;
      } catch { /* The fallback still identifies the submitted version. */ }
      setReceipt(savedReceipt); setFinished(true);
      try { window.sessionStorage.removeItem(draftKey); window.sessionStorage.setItem(receiptKey, JSON.stringify(savedReceipt)); }
      catch { setStorageWarning(true); }
    } catch (failure) { setError(failure.message || 'Could not submit. Your answers are still here; please try again.'); }
    finally { setSubmitting(false); }
  };
  const downloadReceipt = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `eduthemes-consent-v${study.version_number}.json`; anchor.click(); URL.revokeObjectURL(url);
  };

  if (!code) return <main className="study-shell participant-shell"><span className="study-eyebrow">Participant portal</span><h1>Join a study</h1><p>Enter the code your researcher shared with you.</p><CanvasConnection />
    <form className="study-panel join-form" onSubmit={(event) => { event.preventDefault(); navigate(`/join/${entryCode.trim().toUpperCase()}`); }}><label htmlFor="study-code">Study code</label><input id="study-code" value={entryCode} onChange={(event) => setEntryCode(event.target.value)} required maxLength={12} autoComplete="off" placeholder="12-character code" /><button className="study-primary" type="submit">Continue</button></form><p><Link to="/my-studies">Return to my saved activities</Link></p></main>;

  if (multiActivity && !loading && resolvedCode === code) return <JoinActivityPlan study={study} code={code} />;

  return <main className="study-shell participant-shell">
    <span className="study-eyebrow">Participant portal</span>
    {!supabaseConfigured ? <p role="alert">This site has not been connected to Supabase yet.</p> : preparingStudy ? <LoadingSkeleton variant="study" rows={2} label="Loading your study…" /> : finished ? <section className="study-panel" role="status"><h1>Thank you for participating</h1><p>Your responses were submitted successfully for version {study.version_number} of this study.</p>
      {receipt?.consent_accepted_at && <p>Consent recorded {new Date(receipt.consent_accepted_at).toLocaleString()}.</p>}
      <p className="study-help">Submission reference: {receipt?.submission_id}</p><div className="study-actions"><button type="button" className="study-secondary" onClick={downloadReceipt}>Download study receipt</button><Link to="/">Join another study</Link></div>
    </section> : study ? <>
      <h1>{study.title}</h1><p className="study-version-label">Study version {study.version_number}</p>{study.description && <p className="study-intro">{study.description}</p>}
      {study.activities?.[0]?.instructions && <p className="study-preserve-copy">{study.activities[0].instructions}</p>}
      {study.contact_info && <p className="study-help study-preserve-copy"><strong>Study contact:</strong> {study.contact_info}</p>}
      {study.compensation_details && <p className="study-note study-preserve-copy"><strong>Compensation or course credit:</strong> {study.compensation_details}</p>}
      {study.consent_required && !consented ? <section className="study-panel study-consent-panel"><h2>Before you take part</h2><p>Read the study information and decide whether you want to participate.</p><div className="study-consent-copy">{study.consent_text}</div>
        <form onSubmit={(event) => { event.preventDefault(); if (accepted) setConsented(true); }}><label className="study-consent-choice"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required /> I have read the information above and agree to participate in this version of the study.</label><div className="study-actions"><button type="submit" className="study-primary" disabled={!accepted}>Agree and continue</button><Link to="/">Leave study</Link></div></form>
      </section> : <>
        <p className="study-privacy">{withCanvas ? 'Your answers and the Canvas details you confirm below are shared with this study’s research team.' : 'This study collects anonymous responses. Canvas details are not attached to your answers.'}</p>
        {study.consent_required && <details className="study-consent-reminder"><summary>Review the consent you accepted</summary><div className="study-consent-copy">{study.consent_text}</div><button type="button" className="study-text-button" onClick={() => { setAccepted(false); setConsented(false); }}>Return to consent</button></details>}
        {study.participant_mode !== 'anonymous' && <CanvasConnection requiredForStudy={study.participant_mode === 'canvas'} />}
        {study.participant_mode === 'canvas' && !canvas.participant && <p className="study-error" role="alert">This study requires verified Canvas details. Open EduThemes from your Canvas course, then enter this study code.</p>}
        {storageWarning && <p className="study-note" role="status">This browser cannot save your draft. Keep this page open until you submit.</p>}
        <form className="study-panel participant-form" onSubmit={submit}>
          <fieldset className="participant-fields" disabled={submitting} hidden={submitting}>
          {(study.questions || []).map((question, index) => <div className="study-field" key={question.id}><label htmlFor={`answer-${question.id}`}>{index + 1}. {question.prompt}</label><textarea id={`answer-${question.id}`} value={answers[question.id] || ''} onChange={(event) => setAnswers((previous) => ({ ...previous, [question.id]: event.target.value }))} rows={5} maxLength={10000} required /></div>)}
          {withCanvas && canvas.participant && <label className="canvas-consent"><input type="checkbox" checked={shareDetails} onChange={(event) => setShareDetails(event.target.checked)} required /> I agree to include the Canvas details shown above with my answers to this study.</label>}
          </fieldset>
          {submitting && <LoadingSkeleton variant="connection" label="Submitting your responses and preparing your receipt…" />}
          {error && <p className="study-error" role="alert">{error}</p>}
          <button className="study-primary" type="submit" aria-busy={submitting} disabled={submitting || (withCanvas && (canvas.loading || Boolean(canvas.error) || !canvas.participant || !shareDetails))}>{submitting ? <><Skeleton className="edu-skeleton--button" />Submitting…</> : 'Submit responses'}</button>
        </form>
      </>}
    </> : <section className="study-panel"><h1>Study unavailable</h1><p role="alert">{error}</p><Link to="/">Enter another code</Link></section>}
  </main>;
}
