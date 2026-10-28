import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import LoadingSkeleton, { Skeleton } from './LoadingSkeleton';
import { browserStorage, pendingStudyKey, persistentStudyLinks, sessionStudyLinks, storeStudyLink } from '../utils/studyHub';

export default function JoinActivityPlan({ study, code }) {
  const navigate = useNavigate();
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
  return <main className="study-shell participant-shell study-plan-join">
    <span className="study-eyebrow">Participant portal</span><h1>{study.title}</h1><p className="study-version-label">Version {study.version_number} · {study.activities.length} activities</p>
    {study.description && <p className="study-intro">{study.description}</p>}
    <section className="study-panel"><h2>Your activity plan</h2><ol className="participant-plan-list">{study.activities.map((activity) => <li key={activity.id}><strong>{activity.title}</strong><span>{activity.required ? 'Required' : 'Optional'} · Opens on day {activity.opens_after_days}{activity.due_after_days != null ? ` · Due on day ${activity.due_after_days}` : ''} after joining</span></li>)}</ol><p className="study-help">Activities unlock in order after earlier required activities are completed. You can return with your private study link.</p>
      {study.compensation_details && <><h3>Compensation or course credit</h3><p className="study-preserve-copy">{study.compensation_details}</p></>}{study.contact_info && <><h3>Study contact</h3><p className="study-preserve-copy">{study.contact_info}</p></>}
    </section>
    <section className="study-panel study-consent-panel"><h2>Before you join</h2><div className="study-consent-copy">{study.consent_text}</div><p className="study-privacy">Your activities are connected using a study-specific code. This flow does not collect your name, email, or Canvas details. Anyone with your private return link can view your saved work, so keep it private.</p>
      <form onSubmit={join}><fieldset className="participant-fields" disabled={joining}>
        <label className="study-consent-choice"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required /> I have read the study information and agree to participate in this version.</label>
        <label className="study-consent-choice"><input type="checkbox" checked={linked} onChange={(event) => setLinked(event.target.checked)} required /> I agree that my responses and progress across these activities will be linked using a study-specific code.</label>
        <label className="study-consent-choice"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Remember my private return link on this browser after I close it.</label>
      </fieldset>
        {joining && <LoadingSkeleton variant="connection" label="Preparing your private study hub…" />}{error && <p className="study-error" role="alert">{error}</p>}
        <div className="study-actions"><button type="submit" className="study-primary" disabled={joining || !accepted || !linked} aria-busy={joining}>{joining ? <><Skeleton className="edu-skeleton--button" />Joining study…</> : 'Join and open my activities'}</button><Link to="/my-studies">I already have a private return link</Link></div>
      </form>
    </section>
  </main>;
}
