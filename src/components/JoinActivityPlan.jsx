import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import LoadingSkeleton, { Skeleton } from './LoadingSkeleton';
import { StudyInformation, StudySlide } from './StudySlides';
import { browserStorage, pendingStudyKey, persistentStudyLinks, readStudyLinks, removeStudyLink, sessionStudyLinks, storeStudyLink } from '../utils/studyHub';
import { Button } from "@eduthemes/ui/components/button";
import { Label } from "@eduthemes/ui/components/label";
import { Checkbox } from "@eduthemes/ui/components/checkbox";
export default function JoinActivityPlan({
  study,
  code,
  recruitmentKey,
  onJoined,
  onCancel
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState('plan');
  const [accepted, setAccepted] = useState(false);
  const [linked, setLinked] = useState(false);
  const [remember, setRemember] = useState(() => Boolean(recruitmentKey && readStudyLinks(browserStorage('localStorage'), persistentStudyLinks).some(item => item.key === recruitmentKey)));
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const join = async event => {
    event.preventDefault();
    if (joining || !accepted || !linked) return;
    setJoining(true);
    setError('');
    try {
      const key = recruitmentKey || pendingStudyKey(browserStorage('sessionStorage'), code, study.version_id);
      const {
        data,
        error: failure
      } = await supabase.rpc(recruitmentKey ? 'enroll_recruited_study' : 'enroll_study', recruitmentKey ? {
        p_access_key: key,
        p_consent_accepted: accepted,
        p_linking_accepted: linked
      } : {
        p_code: code,
        p_version_id: study.version_id,
        p_access_key: key,
        p_consent_accepted: accepted,
        p_linking_accepted: linked
      });
      if (failure) throw failure;
      const record = {
        key,
        title: data.title,
        version: data.version_number,
        reference: data.participant_reference
      };
      try {
        storeStudyLink(browserStorage('sessionStorage'), sessionStudyLinks, record);
        if (remember) storeStudyLink(browserStorage('localStorage'), persistentStudyLinks, record);else removeStudyLink(browserStorage('localStorage'), persistentStudyLinks, key);
      } catch {/* The private return link remains available on the next screen. */}
      if (onJoined) await onJoined();else navigate(`/my-studies#access=${key}`);
    } catch (failure) {
      setError(failure.message || 'Could not join. Your choices are still here; please try again.');
    } finally {
      setJoining(false);
    }
  };
  return <main className="study-shell participant-shell participant-flow-shell">
    {step === 'plan' ? <StudySlide context="Study activities" slideKey="plan" helpGuide="complete-follow-ups#activity-list" information={<StudyInformation study={study} showDescription={false} />} actions={<div className="study-slides__navigation">{onCancel ? <Button type="button" className="study-slides__back" onClick={onCancel} variant="ghost" size="auto">← Back to recruitment status</Button> : <Link to="/my-studies">I have a private return link</Link>}<Button type="button" className="study-primary study-slides__next" onClick={() => setStep('consent')} variant="default" size="auto">Review study consent <span aria-hidden="true">→</span></Button></div>}>
      <h1 data-slide-heading tabIndex={-1}>{study.title}</h1>
      {study.description && <p className="study-slides__description">{study.description}</p>}
      <ol className="participant-plan-list">{study.activities.map(activity => <li key={activity.id}><strong>{activity.title}</strong><span>{activity.required ? 'Required' : 'Optional'} · Opens on day {activity.opens_after_days}{activity.due_after_days != null ? ` · Due on day ${activity.due_after_days}` : ''} after joining</span></li>)}</ol>
      <p className="study-help">Activities unlock in order after earlier required activities are completed. You can return with your private study link.</p>
    </StudySlide> : step === 'consent' ? <StudySlide studyTitle={study.title} context="Study consent" slideKey="join-consent" helpGuide="consent-and-privacy#consent" information={<StudyInformation study={study} />} actions={<div className="study-slides__navigation"><Button type="button" className="study-slides__back" onClick={() => setStep('plan')} variant="ghost" size="auto">← Back</Button><Button type="submit" form="join-consent" className="study-primary study-slides__next" disabled={!accepted} variant="default" size="auto">Agree and continue <span aria-hidden="true">→</span></Button></div>}>
      <h1 data-slide-heading tabIndex={-1}>Before you join</h1><p className="study-slides__description">Taking part is your choice. Read the consent information below before you decide.</p><div className="study-consent-copy">{study.consent_text}</div>
      <form id="join-consent" onSubmit={event => {
        event.preventDefault();
        if (accepted) setStep('privacy');
      }}><Label className="study-consent-choice"><Checkbox type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} required /> I have read the study information and agree to participate in this version.</Label></form>
    </StudySlide> : <StudySlide studyTitle={study.title} context="Your private study link" slideKey="join-privacy" helpGuide="return-to-study#keep-private" actions={<><div className="study-slides__navigation"><Button type="button" className="study-slides__back" disabled={joining} onClick={() => setStep('consent')} variant="ghost" size="auto">← Back</Button><Button type="submit" form="join-study" className="study-primary study-slides__next" disabled={joining || !accepted || !linked} aria-busy={joining} variant="default" size="auto">{joining ? <><Skeleton className="edu-skeleton--button" />Joining study…</> : <>Join and open my activities <span aria-hidden="true">→</span></>}</Button></div>{joining && <div className="study-slides__footer-note"><LoadingSkeleton variant="inline" label="Preparing your private study hub…" /></div>}</>}>
      <h1 data-slide-heading tabIndex={-1}>Your private return link</h1><p className="study-slides__description">Your activities are connected using a study-specific code. This flow does not collect your name, email, or Canvas details.</p>
      <p className="study-privacy">Anyone with your private return link can view your saved work, so keep it private. Save a copy when your activities open.</p>
      <form id="join-study" onSubmit={join}><fieldset className="participant-fields" disabled={joining}>
        <Label className="study-consent-choice"><Checkbox type="checkbox" checked={linked} onChange={event => setLinked(event.target.checked)} required /> I agree that my responses and progress across these activities will be linked using a study-specific code.</Label>
        <Label className="study-consent-choice"><Checkbox type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /> Remember my private return link on this browser after I close it.</Label>
      </fieldset>{error && <p className="study-error" role="alert">{error}</p>}</form>
    </StudySlide>}
  </main>;
}
