import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase, supabaseConfigured } from '../supabase';
import CanvasConnection, { useCanvas } from './CanvasConnection';
import { canvasToken, submissionRequestId, submitCanvasStudy } from '../utils/canvas';
import { readDraft, submissionArguments, usesCanvas } from '../utils/studyParticipation';
import LoadingSkeleton from './LoadingSkeleton';
import PortalIcon from './PortalIcon';
import JoinActivityPlan from './JoinActivityPlan';
import StudyQuestionSlides, { StudyInformation, StudySlide } from './StudySlides';
import './Studies.css';

export default function Participant() {
  const { code } = useParams();
  const navigate = useNavigate();
  const canvas = useCanvas();
  const [shareDetails, setShareDetails] = useState(false);
  const [step, setStep] = useState('welcome');
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
    setStep('welcome'); setShareDetails(false); setLoadedDraftKey(null); setStudy(null);
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

  if (!code) return <main className="study-shell participant-shell participant-landing">
    <header className="participant-page-heading"><span className="study-eyebrow">PARTICIPANT PORTAL</span><h1>Join a study<span className="portal-title-period">.</span></h1><p>Enter your researcher’s code to get started.</p></header>
    <div className="portal-landing-grid"><div>
      <section className="study-panel portal-join-panel"><span className="portal-panel-icon"><PortalIcon name="flask" /></span><h2>Have a study code?</h2><p>Your researcher will share a code or a link to their study.</p>
        <form className="join-form" onSubmit={(event) => { event.preventDefault(); navigate(`/join/${entryCode.trim().toUpperCase()}`); }}><label htmlFor="study-code">Study code</label><input id="study-code" value={entryCode} onChange={(event) => setEntryCode(event.target.value.toUpperCase())} required maxLength={12} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="Enter your study code" aria-describedby="study-code-help" /><p id="study-code-help" className="study-help">Use the 12-character code your researcher shared.</p><button className="study-primary" type="submit">Continue<PortalIcon name="arrow" /></button></form>
      </section>
      <Link className="portal-return-card" to="/my-studies"><span><PortalIcon name="key" /></span><div><strong>Already taking part?</strong><p>Return to your saved studies and activities.</p></div><PortalIcon name="arrow" /></Link>
      <details className="portal-canvas-details"><summary>Taking part through Canvas?</summary><CanvasConnection /></details>
    </div><aside className="portal-guide" aria-label="What to expect"><span className="study-eyebrow">WHAT TO EXPECT</span><h2>Your perspective<br />makes a difference.</h2><p>A few thoughtful steps, at your own pace.</p><ol><li><span>01</span><div><h3>Find your study</h3><p>Use a code or open the link shared by your research team.</p></div></li><li><span>02</span><div><h3>Choose to take part</h3><p>Read the information and decide whether to give your consent.</p></div></li><li><span>03</span><div><h3>Share your perspective</h3><p>Answer one question at a time, then review before submitting.</p></div></li></ol><div className="portal-guide-note"><PortalIcon name="shield" /><span>Your participation is always your choice.</span></div></aside></div>
    <footer className="portal-page-footer"><span>EduThemes · Educational research</span><span>Participant portal</span></footer>
  </main>;

  if (multiActivity && !loading && resolvedCode === code) return <JoinActivityPlan study={study} code={code} />;

  const openQuestions = () => setStep(withCanvas ? 'identity' : 'questions');
  const returnToConsent = () => { setAccepted(false); setConsented(false); setStep('consent'); };
  const information = study && <StudyInformation study={study}>
    <p className="study-privacy">{withCanvas ? 'Your answers and the Canvas details you confirm are shared with this study’s research team.' : 'This study collects anonymous responses. Canvas details are not attached to your answers.'}</p>
    {study.consent_required && <><h2>Study consent</h2><div className="study-consent-copy">{study.consent_text}</div><button type="button" className="study-text-button" disabled={submitting} onClick={returnToConsent}>Return to consent</button></>}
    {withCanvas && <><CanvasConnection requiredForStudy={study.participant_mode === 'canvas'} /><button type="button" className="study-text-button" disabled={submitting} onClick={() => setStep('identity')}>Review Canvas sharing</button></>}
  </StudyInformation>;

  return <main className="study-shell participant-shell participant-flow-shell">
    {!supabaseConfigured ? <StudySlide context="Participant portal" slideKey="configuration"><h1 data-slide-heading tabIndex={-1}>Study service unavailable</h1><p role="alert">This site has not been connected to Supabase yet.</p></StudySlide>
      : preparingStudy ? <div className="study-slides"><div className="study-slides__loading"><LoadingSkeleton variant="form" rows={1} label="Loading your study…" /></div></div>
      : finished ? <StudySlide studyTitle={study.title} context="Study complete" slideKey="complete" progress={1} total={1} progressLabel="Responses submitted"
        footer={<><span className="study-slides__footer-note">Thank you for sharing your perspective.</span><div className="study-slides__navigation"><button type="button" className="study-secondary" onClick={downloadReceipt}>Download study receipt</button><Link to="/">Join another study</Link></div></>}>
        <span className="study-slides__success" aria-hidden="true">✓</span><span className="study-slides__eyebrow">All done</span>
        <h1 data-slide-heading tabIndex={-1}>Thank you for participating</h1><p className="study-slides__description">Your responses were submitted successfully for version {study.version_number} of this study.</p>
        {receipt?.consent_accepted_at && <p className="study-help">Consent recorded {new Date(receipt.consent_accepted_at).toLocaleString()}.</p>}
        <p className="study-help">Submission reference: {receipt?.submission_id}</p>
      </StudySlide> : !study ? <StudySlide context="Participant portal" slideKey="unavailable"><h1 data-slide-heading tabIndex={-1}>Study unavailable</h1><p className="study-error" role="alert">{error}</p><Link to="/">Enter another code</Link></StudySlide>
      : step === 'welcome' ? <StudySlide studyTitle={`Study version ${study.version_number}`} context="Welcome to your study" slideKey="welcome"
        footer={<><span className="study-slides__footer-note">Take your time. Your perspective matters.</span><div className="study-slides__navigation"><Link to="/">Leave study</Link><button type="button" className="study-primary study-slides__next" onClick={() => study.consent_required && !consented ? setStep('consent') : openQuestions()}>Start study <span aria-hidden="true">→</span></button></div></>}>
        <span className="study-slides__eyebrow">A little reflection. A valuable perspective.</span><h1 data-slide-heading tabIndex={-1}>{study.title}</h1>
        {study.description && <p className="study-slides__description">{study.description}</p>}
        <div className="study-slides__facts"><span>{study.questions.length} {study.questions.length === 1 ? 'question' : 'questions'}</span><span>One question at a time</span><span>{withCanvas ? 'Canvas-identified study' : 'Anonymous responses'}</span></div>
        {study.activities?.[0]?.instructions && <p className="study-preserve-copy">{study.activities[0].instructions}</p>}
        <StudyInformation study={study} />
      </StudySlide> : step === 'consent' ? <StudySlide studyTitle={study.title} context="Before we begin" slideKey="consent"
        footer={<><span className="study-slides__footer-note">Taking part is your choice.</span><div className="study-slides__navigation"><button type="button" className="study-slides__back" onClick={() => setStep('welcome')}>← Back</button><Link to="/">Leave study</Link><button type="submit" form="study-consent" className="study-primary study-slides__next" disabled={!accepted}>Agree and continue <span aria-hidden="true">→</span></button></div></>}>
        <span className="study-slides__eyebrow">Your participation</span><h1 data-slide-heading tabIndex={-1}>Before you take part</h1><p className="study-slides__description">Read the study information and decide whether you want to participate.</p><div className="study-consent-copy">{study.consent_text}</div>
        <form id="study-consent" onSubmit={(event) => { event.preventDefault(); if (accepted) { setConsented(true); openQuestions(); } }}><label className="study-consent-choice"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required /> I have read the information above and agree to participate in this version of the study.</label></form>
        <StudyInformation study={study} />
      </StudySlide> : step === 'identity' ? <StudySlide studyTitle={study.title} context="Your Canvas connection" slideKey="identity"
        footer={<><span className="study-slides__footer-note">Review the details shared with the study team.</span><div className="study-slides__navigation"><button type="button" className="study-slides__back" onClick={() => setStep(study.consent_required ? 'consent' : 'welcome')}>← Back</button><button type="submit" form="canvas-sharing" className="study-primary study-slides__next" disabled={!canvas.participant || !shareDetails || canvas.loading || Boolean(canvas.error)}>Continue to questions <span aria-hidden="true">→</span></button></div></>}>
        <span className="study-slides__eyebrow">One more thing</span><h1 data-slide-heading tabIndex={-1}>Confirm what you share</h1><CanvasConnection requiredForStudy={study.participant_mode === 'canvas'} />
        {!canvas.participant && <p className="study-error" role="alert">This study requires verified Canvas details. Open EduThemes from your Canvas course, then enter this study code.</p>}
        <form id="canvas-sharing" onSubmit={(event) => { event.preventDefault(); if (canvas.participant && shareDetails && !canvas.loading && !canvas.error) setStep('questions'); }}>
          {canvas.participant && <label className="study-consent-choice"><input type="checkbox" checked={shareDetails} onChange={(event) => setShareDetails(event.target.checked)} required /> I agree to include the Canvas details shown above with my answers to this study.</label>}
        </form>
      </StudySlide> : <StudyQuestionSlides studyTitle={study.title} context="Your perspective" questions={study.questions || []} answers={answers}
        onChange={(id, value) => setAnswers((previous) => ({ ...previous, [id]: value }))} onSubmit={submit} submitting={submitting}
        onPrevious={() => setStep(withCanvas ? 'identity' : study.consent_required ? 'consent' : 'welcome')}
        submitDisabled={withCanvas && (canvas.loading || Boolean(canvas.error) || !canvas.participant || !shareDetails)}
        notices={<>{storageWarning && <p className="study-note" role="status">This browser cannot save your draft. Keep this page open until you submit.</p>}{withCanvas && (!canvas.participant || !shareDetails || canvas.error) && <p className="study-error" role="alert">Review your Canvas connection and sharing choice in Study information before submitting.</p>}</>}
        status={submitting ? <LoadingSkeleton variant="inline" label="Submitting your responses and preparing your receipt…" /> : undefined} information={information} error={error} />}
  </main>;
}
