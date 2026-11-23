import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import LoadingSkeleton, { Skeleton } from './LoadingSkeleton';
import { StudyInformation, StudySlide } from './StudySlides';
import { browserStorage, pendingStudyKey, persistentStudyLinks, sessionStudyLinks, storeStudyLink } from '../utils/studyHub';
import { visibleScreeningAnswers, visibleScreeningQuestions } from '../utils/screening';
import './Screening.css';
import { Button } from "@eduthemes/ui/components/button";
import { Label } from "@eduthemes/ui/components/label";
import { Checkbox } from "@eduthemes/ui/components/checkbox";
import { Input } from "@eduthemes/ui/components/input";
export default function StudyScreener({
  study,
  code
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState('preview'),
    [answers, setAnswers] = useState({}),
    [index, setIndex] = useState(0);
  const [accepted, setAccepted] = useState(false),
    [remember, setRemember] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const config = study.recruitment,
    questions = visibleScreeningQuestions(config.questions, answers),
    question = questions[index];
  const review = step === 'review';
  const move = next => {
    setError('');
    if (next >= questions.length) setStep('review');else {
      setIndex(next);
      setStep('questions');
    }
  };
  const submit = async event => {
    event.preventDefault();
    if (busy || !accepted) return;
    setBusy(true);
    setError('');
    try {
      const key = pendingStudyKey(browserStorage('sessionStorage'), `screening-${code}`, study.version_id);
      const {
        data,
        error: failure
      } = await supabase.rpc('submit_study_screener', {
        p_code: code,
        p_version_id: study.version_id,
        p_access_key: key,
        p_answers: visibleScreeningAnswers(config.questions, answers),
        p_screening_accepted: accepted
      });
      if (failure) throw failure;
      const record = {
        key,
        title: data.title,
        version: data.version_number,
        reference: data.reference
      };
      try {
        storeStudyLink(browserStorage('sessionStorage'), sessionStudyLinks, record);
        if (remember) storeStudyLink(browserStorage('localStorage'), persistentStudyLinks, record);
      } catch {/* The private link is available in the hub. */}
      navigate(`/my-studies#access=${key}`);
    } catch (failure) {
      setError(failure.message || 'Could not submit screening. Your answers are still here.');
    } finally {
      setBusy(false);
    }
  };
  const advance = event => {
    event.preventDefault();
    if (!answers[question.id]) {
      setError('Choose an answer before continuing.');
      return;
    }
    move(index + 1);
  };
  const change = (id, value) => {
    setError('');
    setAnswers(previous => visibleScreeningAnswers(config.questions, {
      ...previous,
      [id]: value
    }));
  };
  return <main className="study-shell participant-shell participant-flow-shell">
    {step === 'preview' ? <StudySlide context="Study overview" slideKey="screening-preview" helpGuide="complete-screening#screen" actions={<div className="study-slides__navigation"><Link to="/my-studies">Already screened? Open saved studies</Link><Button className="study-primary" onClick={() => setStep('permission')} variant="default" size="auto">Review screening information <span aria-hidden="true">→</span></Button></div>}>
      <h1 data-slide-heading tabIndex={-1}>{study.title}</h1>{study.description && <p className="study-slides__description">{study.description}</p>}
      <div className="study-preview-facts"><div><h2>Who can take part</h2><p>{config.eligibility}</p></div><div><h2>Time and location</h2><p>About {config.estimated_minutes} minutes total · {config.location}</p></div><div><h2>What you will do</h2><p>{study.activities.length} {study.activities.length === 1 ? 'activity' : 'activities'} · {study.questions.length} research questions</p><ul>{study.activities.map(activity => <li key={activity.id}>{activity.title}{activity.required ? ' · required' : ' · optional'}</li>)}</ul></div>{study.compensation_details && <div><h2>Compensation or course credit</h2><p className="study-preserve-copy">{study.compensation_details}</p></div>}{study.contact_info && <div><h2>Study contact</h2><p className="study-preserve-copy">{study.contact_info}</p></div>}</div>
      <p className="study-help">A researcher reviews screening answers before inviting participants. You can check your status through a private return link without an account.</p>
    </StudySlide> : step === 'permission' ? <StudySlide studyTitle={study.title} context="Screening information" slideKey="screening-permission" helpGuide="complete-screening#screen" information={<StudyInformation study={study} />} actions={<div className="study-slides__navigation"><Button className="study-slides__back" onClick={() => setStep('preview')} variant="ghost" size="auto">← Back</Button><Button type="submit" form="screening-permission" className="study-primary" disabled={!accepted} variant="default" size="auto">Continue to screening →</Button></div>}>
      <h1 data-slide-heading tabIndex={-1}>Before screening</h1><div className="study-consent-copy">{config.notice}</div><p className="study-privacy">Screening answers are separate from research responses. A private study link connects your screening, status and, if you later join, your activities. Anyone with that link can open your saved progress. Keep it private. If you’re invited to join, you’ll review study consent separately.</p>
      <form id="screening-permission" onSubmit={event => {
        event.preventDefault();
        if (accepted) move(0);
      }}><Label className="study-consent-choice"><Checkbox type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />I have read the screening information and agree to submit my screening answers for review using a private study link.</Label><Label className="study-consent-choice"><Checkbox type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} />Remember my private return link on this browser after I close it.</Label></form>
    </StudySlide> : <StudySlide studyTitle={study.title} context="Study screening" slideKey={review ? 'screening-review' : question.id} helpGuide="complete-screening#screen"
      variant={review ? 'card' : 'question'}
      stepLabel={review ? undefined : `Screening question ${index + 1}`}
      information={<StudyInformation study={study} />} progress={questions.filter(q => answers[q.id]).length} total={questions.length} progressLabel={`${questions.filter(q => answers[q.id]).length} of ${questions.length} screening questions answered`} actions={<><div className="study-slides__navigation"><Button className="study-slides__back" disabled={busy} onClick={() => review ? move(questions.length - 1) : index ? move(index - 1) : setStep('permission')} variant="ghost" size="auto">← Back</Button><Button type="submit" form="study-screening" className="study-primary" disabled={busy} aria-busy={busy} variant="default" size="auto">{busy ? <><Skeleton className="edu-skeleton--button" />Submitting screening…</> : review ? 'Submit screening' : index === questions.length - 1 ? 'Review screening' : 'Next →'}</Button></div>{busy && <div className="study-slides__footer-note"><LoadingSkeleton variant="inline" label="Submitting your screening and preparing private status…" /></div>}</>}>
      <form id="study-screening" onSubmit={review ? submit : advance} noValidate aria-busy={busy}>
        {review ? <><h1 data-slide-heading tabIndex={-1}>Review your screening</h1><p className="study-slides__description">Your answers go to the study team for review. You are not joining the study yet.</p><ol className="study-slides__review">{questions.map((q, position) => <li key={q.id}><div><h2>{q.prompt}</h2><Button type="button" className="study-text-button" disabled={busy} onClick={() => move(position)} variant="link" size="auto">Edit screening answer {position + 1}</Button></div><p>{q.options.find(o => o.id === answers[q.id])?.label}</p></li>)}</ol></> : <><h1 data-slide-heading tabIndex={-1} id="screening-question-prompt">{question.prompt}</h1><fieldset className="screening-choices" aria-labelledby="screening-question-prompt" disabled={busy}><legend className="sr-only">Choose one answer</legend>{question.options.map(option => <Label className="screening-choice" key={option.id}><Input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} onChange={() => change(question.id, option.id)} /><span>{option.label}</span></Label>)}</fieldset></>}
        {error && <p className="study-error" role="alert">{error}</p>}
      </form>
    </StudySlide>}
  </main>;
}
