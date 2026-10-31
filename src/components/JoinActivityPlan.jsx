import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import LoadingSkeleton, { Skeleton } from './LoadingSkeleton';
import { StudyInformation, StudySlide } from './StudySlides';
import { browserStorage, pendingStudyKey, persistentStudyLinks, sessionStudyLinks, storeStudyLink } from '../utils/studyHub';

export default function JoinActivityPlan({ study, code }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('plan');
  const [accepted, setAccepted] = useState(false);
  const [linked, setLinked] = useState(false);
  const [remember, setRemember] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const join = async (event) => {
    event.preventDefault(); if (joining || !accepted || !linked) return;
    setJoining(true); setError('');
    try {
      const key = pendingStudyKey(browserStorage('sessionStorage'), code, study.version_id);
      const { data, error: failure } = await supabase.rpc('enroll_study', {
        p_code: code, p_version_id: study.version_id, p_access_key: key,
        p_consent_accepted: accepted, p_linking_accepted: linked,
      });
      if (failure) throw failure;
      const record = { key, title: data.title, version: data.version_number, reference: data.participant_reference };
      try {
        storeStudyLink(browserStorage('sessionStorage'), sessionStudyLinks, record);
        if (remember) storeStudyLink(browserStorage('localStorage'), persistentStudyLinks, record);
      } catch { /* The private return link remains available on the next screen. */ }
      navigate(`/my-studies#access=${key}`);
    } catch (failure) { setError(failure.message || 'Could not join. Your choices are still here; please try again.'); }
    finally { setJoining(false); }
  };
  return <main className="study-shell participant-shell participant-flow-shell">
    {step === 'plan' ? <StudySlide studyTitle={`Version ${study.version_number} · ${study.activities.length} activities`} context="Welcome to your study" slideKey="plan"
      footer={<><span className="study-slides__footer-note">You can return between activities.</span><div className="study-slides__navigation"><Link to="/my-studies">I have a private return link</Link><button type="button" className="study-primary study-slides__next" onClick={() => setStep('consent')}>Review study consent <span aria-hidden="true">→</span></button></div></>}>
      <span className="study-slides__eyebrow">Your activity plan</span><h1 data-slide-heading tabIndex={-1}>{study.title}</h1>
      {study.description && <p className="study-slides__description">{study.description}</p>}
      <ol className="participant-plan-list">{study.activities.map((activity) => <li key={activity.id}><strong>{activity.title}</strong><span>{activity.required ? 'Required' : 'Optional'} · Opens on day {activity.opens_after_days}{activity.due_after_days != null ? ` · Due on day ${activity.due_after_days}` : ''} after joining</span></li>)}</ol>
      <p className="study-help">Activities unlock in order after earlier required activities are completed. You can return with your private study link.</p><StudyInformation study={study} />
    </StudySlide> : step === 'consent' ? <StudySlide studyTitle={study.title} context="Before you join" slideKey="join-consent"
      footer={<><span className="study-slides__footer-note">Taking part is your choice.</span><div className="study-slides__navigation"><button type="button" className="study-slides__back" onClick={() => setStep('plan')}>← Back</button><button type="submit" form="join-consent" className="study-primary study-slides__next" disabled={!accepted}>Agree and continue <span aria-hidden="true">→</span></button></div></>}>
      <span className="study-slides__eyebrow">Your participation</span><h1 data-slide-heading tabIndex={-1}>Before you join</h1><p className="study-slides__description">Read the study information and decide whether you want to participate.</p><div className="study-consent-copy">{study.consent_text}</div>
      <form id="join-consent" onSubmit={(event) => { event.preventDefault(); if (accepted) setStep('privacy'); }}><label className="study-consent-choice"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required /> I have read the study information and agree to participate in this version.</label></form><StudyInformation study={study} />
    </StudySlide> : <StudySlide studyTitle={study.title} context="Your private study link" slideKey="join-privacy"
      footer={<><div className="study-slides__footer-note">{joining ? <LoadingSkeleton variant="inline" label="Preparing your private study hub…" /> : 'Your return link connects your activities.'}</div><div className="study-slides__navigation"><button type="button" className="study-slides__back" disabled={joining} onClick={() => setStep('consent')}>← Back</button><button type="submit" form="join-study" className="study-primary study-slides__next" disabled={joining || !accepted || !linked} aria-busy={joining}>{joining ? <><Skeleton className="edu-skeleton--button" />Joining study…</> : <>Join and open my activities <span aria-hidden="true">→</span></>}</button></div></>}>
      <span className="study-slides__eyebrow">Keep your place</span><h1 data-slide-heading tabIndex={-1}>Pick up where you left off.</h1><p className="study-slides__description">Your activities are connected using a study-specific code. This flow does not collect your name, email, or Canvas details.</p>
      <p className="study-privacy">Anyone with your private return link can view your saved work, so keep it private. Save a copy when your activities open.</p>
      <form id="join-study" onSubmit={join}><fieldset className="participant-fields" disabled={joining}>
        <label className="study-consent-choice"><input type="checkbox" checked={linked} onChange={(event) => setLinked(event.target.checked)} required /> I agree that my responses and progress across these activities will be linked using a study-specific code.</label>
        <label className="study-consent-choice"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Remember my private return link on this browser after I close it.</label>
      </fieldset>{error && <p className="study-error" role="alert">{error}</p>}</form>
    </StudySlide>}
  </main>;
}
