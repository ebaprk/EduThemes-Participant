import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSkeleton, { Skeleton } from './LoadingSkeleton';
import JoinActivityPlan from './JoinActivityPlan';
import { screeningNextSteps,screeningStatusLabels } from '../utils/screening';
import './Screening.css';

export default function RecruitmentStatus({ screening,accessKey,refreshing,onRefresh,onJoined,onBack,copyLink,downloadLink,remember,onRemember,error,notice,storageWarning }) {
  const [joining,setJoining]=useState(false);
  if(joining)return <JoinActivityPlan key={screening.version_id} study={screening} code={screening.code} recruitmentKey={accessKey} onJoined={onJoined} onCancel={()=>setJoining(false)}/>;
  return <main className="study-shell participant-shell participant-hub participant-hub--wide">
    <button className="study-text-button" onClick={onBack}>← Saved studies</button><span className="study-eyebrow">Your screening and recruitment</span><h1>{screening.title}</h1><p className="study-version-label">Version {screening.version_number} · Your reference: {screening.reference}</p>
    {error&&<p className="study-error" role="alert">{error}</p>}{notice&&<p className="study-note" role="status">{notice}</p>}
    <div className="participant-hub-workspace"><section className="study-panel screening-status-panel"><div className="study-section-heading"><h2>{screeningStatusLabels[screening.recruitment_status]}</h2><button className="study-secondary" disabled={refreshing} aria-busy={refreshing} onClick={onRefresh}>{refreshing?<><Skeleton className="edu-skeleton--button"/>Refreshing…</>:'Check for updates'}</button></div>
      {refreshing&&<LoadingSkeleton variant="inline" label="Checking your recruitment status…"/>}<p>{screeningNextSteps[screening.recruitment_status]}</p><p className="study-help">Screening submitted {new Date(screening.screened_at).toLocaleString()}. Updates appear here; this flow does not send emails.</p>
      {!screening.current_version?<p className="study-note">The study has a newer version. Contact the study team before continuing; your original screening is preserved.</p>:screening.study_status!=='open'?<p className="study-note">The study team has paused or closed participation. Your screening status remains available.</p>:screening.can_join&&<button className="study-primary" disabled={refreshing} onClick={()=>setJoining(true)}>Review consent and join →</button>}
      {screening.contact_info&&<><h3>Study contact</h3><p className="study-preserve-copy">{screening.contact_info}</p></>}
      <Link to="/">Return to the participant portal</Link>
    </section><aside className="study-panel participant-return-panel"><h2>Your private return link</h2><p>Use this link to check the study team’s decision and, if invited, join. Anyone holding it can open your saved progress. Save a copy somewhere private; the team cannot recover a lost key.</p><div className="study-actions"><button className="study-secondary" onClick={copyLink}>Copy private return link</button><button className="study-text-button" onClick={downloadLink}>Download private return link</button></div><label className="study-consent-choice"><input type="checkbox" checked={remember} onChange={event=>onRemember(event.target.checked)}/>Remember this link on this browser after I close it.</label>{storageWarning&&<p className="study-note" role="status">This browser could not remember your link. Copy or download it before leaving.</p>}<details><summary>Your screening information</summary><p className="study-preserve-copy">{screening.recruitment.notice}</p></details></aside></div>
  </main>;
}
