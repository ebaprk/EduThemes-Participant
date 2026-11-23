import { FeatureHelp } from '@eduthemes/ui/components/feature-help';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase, supabaseConfigured } from '../supabase';
import CanvasConnection, { useCanvas } from './CanvasConnection';
import { canvasToken, submissionRequestId, submitCanvasStudy } from '../utils/canvas';
import { readDraft, submissionArguments, usesCanvas } from '../utils/studyParticipation';
import LoadingSkeleton from './LoadingSkeleton';
import PortalIcon from './PortalIcon';
import { privateResultsPath, resultsCredentials } from '../utils/participantResults';
import JoinActivityPlan from './JoinActivityPlan';
import StudyScreener from './StudyScreener';
import StudyQuestionSlides, { StudyInformation, StudySlide } from './StudySlides';
import './Studies.css';
import { Card } from "@eduthemes/ui/components/card";
import { Label } from "@eduthemes/ui/components/label";
import { Input } from "@eduthemes/ui/components/input";
import { Button } from "@eduthemes/ui/components/button";
import { Checkbox } from "@eduthemes/ui/components/checkbox";
export default function Participant() {
  const {
    code
  } = useParams();
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
  const [resultsAccess, setResultsAccess] = useState(null);
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const [loadedDraftKey, setLoadedDraftKey] = useState(null);
  const withCanvas = study ? usesCanvas(study, Boolean(canvas.participant || canvas.error || canvasToken())) : false;
  const draftKey = study ? `eduthemes.draft.${code}.${study.version_id}.${withCanvas ? `canvas-${canvasToken()?.slice(-12) || 'pending'}` : 'anonymous'}` : null;
  const receiptKey = draftKey ? `${draftKey}.receipt` : null;
  const multiActivity = Boolean(study?.activities?.length > 1);
  const preparingStudy = loading || resolvedCode !== code || Boolean(study && !multiActivity && (canvas.loading || loadedDraftKey !== draftKey));
  useEffect(() => {
    setAnswers({});
    setFinished(false);
    setReceipt(null);
    setResultsAccess(null);
    setAccepted(false);
    setConsented(false);
    setStep('welcome');
    setShareDetails(false);
    setLoadedDraftKey(null);
    setStudy(null);
    if (!code || !supabase) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError('');
    supabase.rpc('get_public_study', {
      p_code: code
    }).then(({
      data,
      error: loadError
    }) => {
      if (!active) return;
      setResolvedCode(code);
      setLoading(false);
      if (loadError) setError(loadError.message);else if (!data) setError('This study link is unavailable or the study is closed.');else setStudy(data);
    });
    return () => {
      active = false;
    };
  }, [code]);
  useEffect(() => {
    setShareDetails(false);
  }, [canvas.participant]);
  useEffect(() => {
    if (!study || multiActivity || !draftKey || canvas.loading) return;
    try {
      setAnswers(readDraft(window.sessionStorage, draftKey, study.questions));
      const savedReceipt = JSON.parse(window.sessionStorage.getItem(receiptKey) || 'null');
      setReceipt(savedReceipt);
      setFinished(Boolean(savedReceipt));
      setResultsAccess(resultsCredentials(JSON.parse(window.sessionStorage.getItem(`${receiptKey}.results`) || 'null')));
    } catch {
      setStorageWarning(true);
      setAnswers({});
    }
    setLoadedDraftKey(draftKey);
  }, [draftKey, canvas.loading, study, receiptKey, multiActivity]);
  useEffect(() => {
    if (!draftKey || loadedDraftKey !== draftKey || finished) return;
    try {
      window.sessionStorage.setItem(draftKey, JSON.stringify(answers));
    } catch {
      setStorageWarning(true);
    }
  }, [answers, draftKey, loadedDraftKey, finished]);
  const submit = async event => {
    event.preventDefault();
    if (!study || submitting || withCanvas && (canvas.loading || canvas.error)) return;
    setError('');
    setSubmitting(true);
    try {
      const requestId = submissionRequestId(code, study.version_id, draftKey);
      const args = submissionArguments(code, study, answers, consented, requestId);
      let submissionId;
      if (withCanvas) {
        if (!canvas.participant || !shareDetails) throw new Error('Connect through Canvas and confirm sharing your details before submitting.');
        const result = await submitCanvasStudy(code, answers, requestId, {
          versionId: study.version_id,
          accepted: args.p_consent_accepted
        });
        submissionId = result.submission_id;
      } else {
        const {
          data,
          error: submitError
        } = await supabase.rpc('submit_study_version', args);
        if (submitError) throw submitError;
        submissionId = data;
      }
      // Saving has succeeded even if receipt retrieval or browser storage fails.
      let savedReceipt = {
        submission_id: submissionId,
        title: study.title,
        version_id: study.version_id,
        version_number: study.version_number,
        consent_text: study.consent_text
      };
      try {
        const {
          data
        } = await supabase.rpc('get_study_receipt', {
          p_submission_id: submissionId,
          p_request_id: requestId
        });
        if (data) savedReceipt = data;
      } catch {/* The fallback still identifies the submitted version. */}
      setReceipt(savedReceipt);
      setFinished(true);
      const results = {
        p_submission_id: submissionId,
        p_request_id: requestId
      };
      setResultsAccess(results);
      try {
        window.sessionStorage.removeItem(draftKey);
        window.sessionStorage.setItem(receiptKey, JSON.stringify(savedReceipt));
        window.sessionStorage.setItem(`${receiptKey}.results`, JSON.stringify(results));
      } catch {
        setStorageWarning(true);
      }
    } catch (failure) {
      setError(failure.message || 'Could not submit. Your answers are still here; please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  const downloadReceipt = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], {
      type: 'application/json'
    }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `eduthemes-consent-v${study.version_number}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  if (!code) return (
    <main className="study-shell participant-shell participant-portal-page">
      <header className="participant-page-heading">
        <h1>Join a study</h1>
        <p>Enter the 12-character code your researcher shared with you.</p>
        <FeatureHelp audience="participant" guide="join-a-study" label="Help with joining a study" />
      </header>
      <form className="study-panel portal-entry-form" onSubmit={event => {
        event.preventDefault();
        navigate(`/join/${entryCode.trim().toUpperCase()}`);
      }}>
        <Label htmlFor="study-code">Study code</Label>
        <div className="portal-entry-controls">
          <Input id="study-code" className="portal-code-input" value={entryCode}
            onChange={event => setEntryCode(event.target.value.toUpperCase())}
            required minLength={12} maxLength={12} pattern="[A-Fa-f0-9]{12}"
            title="Enter the 12-character study code, using letters A–F and numbers."
            autoComplete="off" autoCapitalize="characters" spellCheck={false} />
          <Button className="study-primary" type="submit" size="auto">Find study<PortalIcon name="arrow" /></Button>
        </div>
      </form>
      <div className="portal-page-help">
        <details>
          <summary>What happens after I enter my code?<PortalIcon name="chevron" /></summary>
          <p>You can review the study’s purpose, activities, and consent information before deciding whether to take part. Some studies include screening or follow-up activities.</p>
        </details>
        <details>
          <summary>Taking part through Canvas?<PortalIcon name="chevron" /></summary>
          <CanvasConnection />
          <FeatureHelp audience="participant" guide="use-canvas" label="Help with the Canvas connection" />
        </details>
      </div>
    </main>
  );
  if (study?.recruitment?.enabled && !loading && resolvedCode === code) return <StudyScreener key={`${code}:${study.version_id}`} study={study} code={code} />;
  if (multiActivity && !loading && resolvedCode === code) return <JoinActivityPlan study={study} code={code} />;
  const openQuestions = () => setStep(withCanvas ? 'identity' : 'questions');
  const returnToConsent = () => {
    setAccepted(false);
    setConsented(false);
    setStep('consent');
  };
  const information = study && <StudyInformation study={study}>
    <p className="study-privacy">{withCanvas ? 'Your answers and the Canvas details you confirm are shared with this study’s research team.' : 'This study collects anonymous responses. Canvas details are not attached to your answers.'}</p>
    {study.consent_required && <><h2>Study consent</h2><div className="study-consent-copy">{study.consent_text}</div><Button type="button" className="study-text-button" disabled={submitting} onClick={returnToConsent} variant="link" size="auto">Return to consent</Button></>}
    {withCanvas && <><CanvasConnection requiredForStudy={study.participant_mode === 'canvas'} /><Button type="button" className="study-text-button" disabled={submitting} onClick={() => setStep('identity')} variant="link" size="auto">Review Canvas sharing</Button></>}
  </StudyInformation>;
  return <main className="study-shell participant-shell participant-flow-shell">
    {!supabaseConfigured ? <StudySlide context="Participant portal" slideKey="configuration" helpGuide="join-a-study#unavailable"><h1 data-slide-heading tabIndex={-1}>Study service unavailable</h1><p role="alert">This site has not been connected to Supabase yet.</p></StudySlide> : preparingStudy ? <div className="study-slides">
      <Card className="study-slides__surface study-slides__loading"><LoadingSkeleton variant="study-intro" label="Loading your study…" /></Card>
    </div> : finished ? <StudySlide studyTitle={study.title} context="Study complete" slideKey="complete" helpGuide="consent-and-privacy#receipt" className="study-slides--complete" actions={<div className="study-slides__navigation"><Button type="button" className="study-secondary" onClick={downloadReceipt} variant="outline" size="auto">Download study receipt</Button><Link to="/">Join another study</Link></div>}>
        <span className="study-slides__success" aria-hidden="true"><PortalIcon name="check" /></span>
        <h1 data-slide-heading tabIndex={-1}>Thank you for participating</h1>
        <div className="study-completion-summary">
          <p className="study-slides__description">Your responses were submitted successfully for version {study.version_number} of this study.</p>
          <div className="study-completion-details">
            {receipt?.consent_accepted_at && <p className="study-help">Consent recorded {new Date(receipt.consent_accepted_at).toLocaleString()}.</p>}
            <p className="study-help">Submission reference: {receipt?.submission_id}</p>
          </div>
          {resultsAccess && <div className="study-completion-results"><Button asChild variant="outline" size="auto"><Link className="study-secondary" to={privateResultsPath(resultsAccess)}>View and save your private results link</Link></Button></div>}
        </div>
      </StudySlide> : !study ? <StudySlide context="Participant portal" slideKey="unavailable" helpGuide="join-a-study#unavailable"><h1 data-slide-heading tabIndex={-1}>Study unavailable</h1><p className="study-error" role="alert">{error}</p><Link to="/">Enter another code</Link></StudySlide> : step === 'welcome' ? <StudySlide
        context="Study overview"
        slideKey="welcome"
        helpGuide="join-a-study"
        information={<StudyInformation study={study} showDescription={false} />}
        actions={<Button type="button" className="study-primary study-slides__next" onClick={() => study.consent_required && !consented ? setStep('consent') : openQuestions()} size="auto">Start study <PortalIcon name="arrow" /></Button>}
      >
        <h1 data-slide-heading tabIndex={-1}>{study.title}</h1>
        {study.description && <p className="study-slides__description">{study.description}</p>}
        <ul className="study-slides__facts" role="list">
          <li><PortalIcon name="message" />{study.questions.length} {study.questions.length === 1 ? 'question' : 'questions'}</li>
          <li><PortalIcon name="shield" />{withCanvas ? 'Canvas-identified study' : 'Anonymous responses'}</li>
        </ul>
        {study.activities?.[0]?.instructions && <p className="study-slides__description">{study.activities[0].instructions}</p>}
      </StudySlide> : step === 'consent' ? <StudySlide
        studyTitle={study.title}
        context="Study consent"
        slideKey="consent"
        helpGuide="consent-and-privacy#consent"
        information={<StudyInformation study={study} />}
        actions={<div className="study-slides__navigation">
          <Button type="button" className="study-slides__back" onClick={() => setStep('welcome')} variant="ghost" size="auto"><PortalIcon name="arrow-left" /> Back</Button>
          <Button type="submit" form="study-consent" className="study-primary study-slides__next" disabled={!accepted} size="auto">Agree and continue <PortalIcon name="arrow" /></Button>
        </div>}
      >
        <h1 data-slide-heading tabIndex={-1}>Before you take part</h1>
        <p className="study-slides__description">Taking part is your choice. Read the consent information below before you decide.</p>
        <div className="study-consent-copy">{study.consent_text}</div>
        <form id="study-consent" onSubmit={event => {
        event.preventDefault();
        if (accepted) {
          setConsented(true);
          openQuestions();
        }
      }}><Label className="study-consent-choice"><Checkbox type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} required /> I have read the information above and agree to participate in this version of the study.</Label></form>
      </StudySlide> : step === 'identity' ? <StudySlide studyTitle={study.title} context="Your Canvas connection" slideKey="identity" helpGuide="use-canvas#confirm" actions={<div className="study-slides__navigation"><Button type="button" className="study-slides__back" onClick={() => setStep(study.consent_required ? 'consent' : 'welcome')} variant="ghost" size="auto"><PortalIcon name="arrow-left" /> Back</Button><Button type="submit" form="canvas-sharing" className="study-primary study-slides__next" disabled={!canvas.participant || !shareDetails || canvas.loading || Boolean(canvas.error)} size="auto">Continue to questions <PortalIcon name="arrow" /></Button></div>}>
        <h1 data-slide-heading tabIndex={-1}>Confirm what you share</h1><CanvasConnection requiredForStudy={study.participant_mode === 'canvas'} />
        {!canvas.participant && <p className="study-error" role="alert">This study requires verified Canvas details. Open EduThemes from your Canvas course, then enter this study code.</p>}
        <form id="canvas-sharing" onSubmit={event => {
        event.preventDefault();
        if (canvas.participant && shareDetails && !canvas.loading && !canvas.error) setStep('questions');
      }}>
          {canvas.participant && <Label className="study-consent-choice"><Checkbox type="checkbox" checked={shareDetails} onChange={event => setShareDetails(event.target.checked)} required /> I agree to include the Canvas details shown above with my answers to this study.</Label>}
        </form>
      </StudySlide> : <StudyQuestionSlides studyTitle={study.title} context="Study questions" questions={study.questions || []} answers={answers} onChange={(id, value) => setAnswers(previous => ({
      ...previous,
      [id]: value
    }))} onSubmit={submit} submitting={submitting} onPrevious={() => setStep(withCanvas ? 'identity' : study.consent_required ? 'consent' : 'welcome')} submitDisabled={withCanvas && (canvas.loading || Boolean(canvas.error) || !canvas.participant || !shareDetails)} notices={<>{storageWarning && <p className="study-note" role="status">This browser cannot save your draft. Keep this page open until you submit.</p>}{withCanvas && (!canvas.participant || !shareDetails || canvas.error) && <p className="study-error" role="alert">Review your Canvas connection and sharing choice in Study information before submitting.</p>}</>} status={submitting ? <LoadingSkeleton variant="inline" label="Submitting your responses and preparing your receipt…" /> : undefined} information={information} error={error} />}
  </main>;
}
