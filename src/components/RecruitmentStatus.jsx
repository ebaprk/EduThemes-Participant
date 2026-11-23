import { FeatureHelp } from '@eduthemes/ui/components/feature-help';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSkeleton, { Skeleton } from './LoadingSkeleton';
import JoinActivityPlan from './JoinActivityPlan';
import { screeningNextSteps, screeningStatusLabels } from '../utils/screening';
import './Screening.css';
import { Button } from "@eduthemes/ui/components/button";
import { Card } from "@eduthemes/ui/components/card";
import { Label } from "@eduthemes/ui/components/label";
import { Checkbox } from "@eduthemes/ui/components/checkbox";
export default function RecruitmentStatus({
  screening,
  accessKey,
  refreshing,
  onRefresh,
  onJoined,
  onBack,
  copyLink,
  downloadLink,
  remember,
  onRemember,
  error,
  notice,
  storageWarning
}) {
  const [joining, setJoining] = useState(false);
  if (joining) return <JoinActivityPlan key={screening.version_id} study={screening} code={screening.code} recruitmentKey={accessKey} onJoined={onJoined} onCancel={() => setJoining(false)} />;
  return <main className="study-shell participant-shell participant-hub participant-hub--wide">
    <Button className="study-text-button" onClick={onBack} variant="link" size="auto">← Saved studies</Button><span className="study-eyebrow">Your screening and recruitment</span><h1>{screening.title}</h1><p className="study-version-label">Version {screening.version_number} · Your reference: {screening.reference}</p>
    {error && <p className="study-error" role="alert">{error}</p>}{notice && <p className="study-note" role="status">{notice}</p>}
    <FeatureHelp audience="participant" guide="complete-screening#check-status" label="What your screening status means" />
    <div className="participant-hub-workspace"><Card className="study-panel screening-status-panel" as="section"><div className="study-section-heading"><h2>{screeningStatusLabels[screening.recruitment_status]}</h2><Button className="study-secondary" disabled={refreshing} aria-busy={refreshing} onClick={onRefresh} variant="outline" size="auto">{refreshing ? <><Skeleton className="edu-skeleton--button" />Refreshing…</> : 'Check for updates'}</Button></div>
      {refreshing && <LoadingSkeleton variant="inline" label="Checking your recruitment status…" />}<p>{screeningNextSteps[screening.recruitment_status]}</p><p className="study-help">Screening submitted {new Date(screening.screened_at).toLocaleString()}. Updates appear here; this flow does not send emails.</p>
      {!screening.current_version ? <p className="study-note">The study has a newer version. Contact the study team before continuing; your original screening is preserved.</p> : screening.study_status !== 'open' ? <p className="study-note">The study team has paused or closed participation. Your screening status remains available.</p> : screening.can_join && <Button className="study-primary" disabled={refreshing} onClick={() => setJoining(true)} variant="default" size="auto">Review consent and join →</Button>}
      {screening.contact_info && <><h3>Study contact</h3><p className="study-preserve-copy">{screening.contact_info}</p></>}
      <Link to="/">Return to the participant portal</Link>
    </Card><aside className="study-panel participant-return-panel"><h2>Your private return link</h2><p>Anyone with this link can open your progress. Keep a private copy; a lost key cannot be recovered.</p><div className="study-actions"><Button className="study-secondary" onClick={copyLink} variant="outline" size="auto">Copy private return link</Button><Button className="study-text-button" onClick={downloadLink} variant="link" size="auto">Download private return link</Button></div><Label className="study-consent-choice"><Checkbox type="checkbox" checked={remember} onChange={event => onRemember(event.target.checked)} />Remember this link on this browser after I close it.</Label>{storageWarning && <p className="study-note" role="status">This browser could not remember your link. Copy or download it before leaving.</p>}<details><summary>Your screening information</summary><p className="study-preserve-copy">{screening.recruitment.notice}</p></details></aside></div>
  </main>;
}
