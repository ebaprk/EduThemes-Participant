import { FeatureHelp } from '@eduthemes/ui/components/feature-help';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase, supabaseConfigured } from '../supabase';
import LoadingSkeleton, { Skeleton } from './LoadingSkeleton';
import StudyActivityForm from './StudyActivityForm';
import RecruitmentStatus from './RecruitmentStatus';
import PortalIcon from './PortalIcon';
import { privateResultsPath } from '../utils/participantResults';
import { browserStorage, forgetStudyLink, parseStudyKey, persistentStudyLinks, privateStudyUrl, readStudyLinks, removeStudyLink, sessionStudyLinks, storeStudyLink } from '../utils/studyHub';
import './Studies.css';
import { Card } from "@eduthemes/ui/components/card";
import { Button } from "@eduthemes/ui/components/button";
import { Label } from "@eduthemes/ui/components/label";
import { Input } from "@eduthemes/ui/components/input";
import { ManagedDialog } from "@eduthemes/ui/workbench";
import { Progress } from "@eduthemes/ui/components/progress";
import { Checkbox } from "@eduthemes/ui/components/checkbox";
const rewardLabels = {
  not_recorded: 'No status recorded yet',
  not_applicable: 'Not applicable',
  awaiting_completion: 'Awaiting completion',
  ready: 'Ready for coordinator handoff',
  handed_off: 'Handed off to the existing process',
  confirmed: 'Confirmed by the study coordinator'
};
const statusLabels = {
  completed: 'Completed',
  paused: 'Study paused',
  blocked: 'Complete earlier required activities first',
  upcoming: 'Opens later',
  overdue: 'Past due · still open',
  in_progress: 'Draft in progress',
  available: 'Ready to begin'
};
const date = value => value ? new Date(value).toLocaleString(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
}) : '';
function savedStudies() {
  const records = [...readStudyLinks(browserStorage('sessionStorage'), sessionStudyLinks), ...readStudyLinks(browserStorage('localStorage'), persistentStudyLinks)];
  return [...new Map(records.map(record => [record.key, record])).values()];
}
export default function StudyHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const [accessKey, setAccessKey] = useState(() => parseStudyKey(location.hash));
  const [linkInput, setLinkInput] = useState('');
  const [links, setLinks] = useState(savedStudies);
  const [study, setStudy] = useState(null);
  const [resolvedKey, setResolvedKey] = useState(null);
  const [loading, setLoading] = useState(Boolean(accessKey));
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(null);
  const [editor, setEditor] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const [remember, setRemember] = useState(false);
  const [forgetTarget, setForgetTarget] = useState(null);
  const [forgetError, setForgetError] = useState('');
  const forgetDialog = useRef(null);
  const returnLinkField = useRef(null);
  const forgetButton = useRef(null);
  useEffect(() => {
    if (forgetTarget) forgetDialog.current?.showModal();
    else forgetDialog.current?.close();
  }, [forgetTarget]);
  const forget = () => {
    try {
      forgetStudyLink(browserStorage('sessionStorage'), browserStorage('localStorage'), forgetTarget.key);
      setLinks(savedStudies());
      setNotice('Saved link forgotten in this browser. Your participation and answers are unchanged.');
      setForgetTarget(null);
    } catch (failure) {
      setLinks(savedStudies());
      setForgetError(failure.message);
    }
  };
  const generation = useRef(0);
  const currentKey = useRef(accessKey);
  currentKey.current = accessKey;
  useEffect(() => {
    if (!location.hash) return;
    const key = parseStudyKey(location.hash);
    if (key) {
      setAccessKey(key);
      setEditor(null);
      setError('');
    } else setError('That private return link is incomplete. Paste the full link or study key below.');
    navigate('/my-studies', {
      replace: true
    });
  }, [location.hash, navigate]);
  const load = useCallback(async (initial = false) => {
    if (!accessKey || !supabase) return;
    const request = ++generation.current;
    if (initial) setLoading(true);else setRefreshing(true);
    try {
      const {
        data,
        error: failure
      } = await supabase.rpc('get_participant_portal', {
        p_access_key: accessKey
      });
      if (request !== generation.current) return;
      if (failure) throw failure;
      setStudy(data);
      const info = data.screening || data;
      const record = {
        key: accessKey,
        title: info.title,
        version: info.version_number,
        reference: info.participant_reference || info.reference
      };
      const remembered = readStudyLinks(browserStorage('localStorage'), persistentStudyLinks).some(item => item.key === accessKey);
      if (initial) setRemember(remembered);
      try {
        storeStudyLink(browserStorage('sessionStorage'), sessionStudyLinks, record);
        if (remembered) storeStudyLink(browserStorage('localStorage'), persistentStudyLinks, record);
      } catch {
        setStorageWarning(true);
      }
      setLinks(savedStudies());
    } catch (failure) {
      if (request === generation.current) setError(failure.message || 'Could not open your private study.');
    } finally {
      if (request === generation.current) {
        setResolvedKey(accessKey);
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [accessKey]);
  useEffect(() => {
    setStudy(null);
    setEditor(null);
    setError('');
    setNotice('');
    if (accessKey) load(true);else setLoading(false);
    return () => {
      generation.current += 1;
    };
  }, [load, accessKey]);
  const open = key => {
    setAccessKey(key);
    setEditor(null);
    setError('');
    setNotice('');
  };
  const backToList = () => {
    setAccessKey(null);
    setStudy(null);
    setEditor(null);
    setStarting(null);
    setError('');
    setNotice('');
    setLinks(savedStudies());
  };
  const updateRemember = checked => {
    setRemember(checked);
    try {
      if (checked) storeStudyLink(browserStorage('localStorage'), persistentStudyLinks, {
        key: accessKey,
        title: (study.screening || study).title,
        version: (study.screening || study).version_number,
        reference: study.screening?.reference || study.participant_reference
      });else removeStudyLink(browserStorage('localStorage'), persistentStudyLinks, accessKey);
      setLinks(savedStudies());
    } catch {
      setStorageWarning(true);
      setRemember(false);
    }
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(privateStudyUrl(window.location.origin, accessKey));
      setNotice('Private return link copied. Keep it somewhere only you can access.');
    } catch {
      setError('Could not copy the link. Download it instead.');
    }
  };
  const download = (content, filename, type = 'application/json') => {
    const url = URL.createObjectURL(new Blob([type === 'application/json' ? JSON.stringify(content, null, 2) : content], {
      type
    }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };
  const start = async activity => {
    if (starting) return;
    const key = accessKey;
    setStarting(activity.id);
    setError('');
    setNotice('');
    try {
      const {
        data,
        error: failure
      } = await supabase.rpc('start_study_activity', {
        p_access_key: key,
        p_activity_id: activity.id
      });
      if (key !== currentKey.current) return;
      if (failure) throw failure;
      setEditor({
        activity,
        progress: data
      });
    } catch (failure) {
      if (key === currentKey.current) setError(failure.message || 'Could not start this activity.');
    } finally {
      if (key === currentKey.current) setStarting(null);
    }
  };
  useLayoutEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }, [resolvedKey, editor?.activity.id]);
  const required = study?.activities?.filter(activity => activity.required) || [];
  const completed = required.filter(activity => activity.status === 'completed').length;
  if (study?.screening && !loading && resolvedKey === accessKey) return <RecruitmentStatus key={accessKey} screening={study.screening} accessKey={accessKey} refreshing={refreshing} onRefresh={() => {
    setError('');
    load();
  }} onJoined={() => load()} onBack={backToList} copyLink={copyLink} downloadLink={() => download(privateStudyUrl(window.location.origin, accessKey), 'eduthemes-private-study-link.txt', 'text/plain')} remember={remember} onRemember={updateRemember} error={error} notice={notice} storageWarning={storageWarning} />;
  if (editor && study) return <main className="study-shell participant-shell participant-flow-shell"><StudyActivityForm key={`${accessKey}.${editor.activity.id}`} accessKey={accessKey} study={study} activity={editor.activity} progress={editor.progress} onBack={async () => {
      setEditor(null);
      await load();
    }} onDone={async () => {
      setEditor(null);
      setNotice('Activity submitted. Its consent receipt is available below.');
      await load();
    }} /></main>;
  return <main className={`study-shell participant-shell participant-hub${study && !editor ? ' participant-hub--wide' : ''}${!accessKey ? ' participant-portal-page' : ''}`}>
    {!accessKey ? <>
      <header className="participant-page-heading">
        <h1>My studies</h1>
        <p>Resume a study or review your progress and saved activities.</p>
        <FeatureHelp audience="participant" guide="return-to-study" label="Help with saved studies and private links" />
      </header>
      {notice && <p className="study-note" role="status">{notice}</p>}
      {links.length > 0 && <section className="portal-saved-studies" aria-labelledby="saved-studies-heading">
        <h2 id="saved-studies-heading">Saved in this browser</h2>
        <ul className="study-panel">
          {links.map(item => <li key={item.key}>
            <div>
              <h3>{item.title}</h3>
              <p className="study-version-label">Version {item.version} · {item.reference}</p>
            </div>
            <div className="portal-saved-study-actions">
              <Button type="button" onClick={event => {
                forgetButton.current = event.currentTarget;
                setForgetError('');
                setForgetTarget(item);
              }} variant="ghost" size="auto">
                Forget link<span className="sr-only"> for {item.title}</span>
              </Button>
              <Button type="button" onClick={() => open(item.key)} variant="outline" size="auto">
                Open study<span className="sr-only"> {item.title}</span><PortalIcon name="arrow" />
              </Button>
            </div>
          </li>)}
        </ul>
      </section>}
      <form className="study-panel portal-entry-form" onSubmit={event => {
        event.preventDefault();
        const key = parseStudyKey(linkInput);
        if (key) {
          open(key);
          setLinkInput('');
        } else {
          setError('Paste a complete private return link or enter your 64-character study key.');
        }
      }}>
        <Label htmlFor="private-study-link">Private return link or study key</Label>
        <div className="portal-entry-controls">
          <Input ref={returnLinkField} id="private-study-link" type="password" autoComplete="off" spellCheck={false}
            value={linkInput} onChange={event => {
              setLinkInput(event.target.value);
              setError('');
            }}
            aria-invalid={Boolean(error)} aria-describedby={error ? 'study-link-error' : 'study-link-help'} required />
          <Button type="submit" className="study-primary" size="auto">Open study<PortalIcon name="arrow" /></Button>
        </div>
        {error ? <p className="study-error" id="study-link-error" role="alert">{error}</p> :
          <p className="study-help" id="study-link-help">Use the private link you received when you joined the study.</p>}
      </form>
      <div className="portal-page-help">
        {links.length === 0 && <p>No saved studies in this browser.</p>}
        <details>
          <summary>How do I return on another device?<PortalIcon name="chevron" /></summary>
          <p>Keep a private copy of your return link and open it on the other device. Anyone with this link can open your study progress and saved answers.</p>
        </details>
      </div>
      <ManagedDialog ref={forgetDialog} className="portal-confirm-dialog" aria-labelledby="forget-link-title" onClose={() => setForgetTarget(null)}
        onCloseAutoFocus={event => {
          event.preventDefault();
          const target = forgetButton.current?.isConnected ? forgetButton.current : returnLinkField.current;
          target?.focus();
        }}>
        <h2 id="forget-link-title">Forget this saved link?</h2><p>This removes the shortcut for “{forgetTarget?.title}” from this browser. Your study participation and saved answers remain with the study.</p><p>Keep a copy of your private return link if you want to come back. The study team cannot recover a lost private key.</p>
        {forgetError && <p className="study-error" role="alert">{forgetError}</p>}
        <div className="study-actions"><Button type="button" className="study-secondary" autoFocus onClick={() => setForgetTarget(null)} variant="outline" size="auto">Keep saved link</Button><Button type="button" className="study-primary" onClick={forget} variant="default" size="auto">Forget saved link</Button></div>
      </ManagedDialog>
    </> : !supabaseConfigured ? <p className="study-error" role="alert">This site has not been connected to its study service.</p> : loading || resolvedKey !== accessKey ? <LoadingSkeleton variant="study" rows={2} label="Opening your private study and saved progress…" /> : !study ? <><h1>Open your private study</h1>{error && <p className="study-error" role="alert">{error}</p>}<div className="study-actions"><Button type="button" className="study-primary" onClick={() => {
          setError('');
          load(true);
        }} variant="default" size="auto">Try again</Button><Button type="button" className="study-text-button" onClick={backToList} variant="link" size="auto">Return to saved studies</Button></div></> : <>
      <Button type="button" className="study-text-button" disabled={Boolean(editor) || Boolean(starting)} onClick={backToList} variant="link" size="auto">← Saved studies</Button>
      <h1>{study.title}</h1>
      <FeatureHelp audience="participant" guide="complete-follow-ups" label="Help with activities and deadlines" /><p className="study-version-label">Version {study.version_number} · Your reference: {study.participant_reference}</p>
      {error && <p className="study-error" role="alert">{error}</p>}{notice && <p className="study-note" role="status">{notice}</p>}
      <div className="participant-hub-workspace"><div className="participant-hub-content">
        <Card className="study-panel participant-progress-panel" as="section"><div className="participant-progress-heading"><div><h2>{completed === required.length ? 'Required activities complete' : 'Your study progress'}</h2><p>{completed} of {required.length} required activities completed</p></div><Button type="button" className="study-text-button" disabled={refreshing || Boolean(starting)} aria-busy={refreshing} onClick={() => {
                setError('');
                load();
              }} variant="link" size="auto">{refreshing ? <><Skeleton className="edu-skeleton--button" />Refreshing…</> : 'Refresh progress'}</Button></div><Progress max={required.length || 1} value={completed} aria-label="Required activity completion" />{study.study_status !== 'open' && <p className="study-note">The study team has paused or closed participation. Your saved work and receipts remain available.</p>}{refreshing && <LoadingSkeleton variant="inline" label="Refreshing your study progress…" />}</Card>
        {starting && <LoadingSkeleton variant="inline" label="Opening your activity and saved draft…" />}<div className="participant-activity-list">{study.activities.map(activity => <Card className={`study-panel participant-activity-card is-${activity.status}`} key={activity.id} as="article"><div className="participant-activity-heading"><span className="study-version-label">{activity.required ? 'Required' : 'Optional'} activity</span><span className="participant-activity-status">{statusLabels[activity.status]}</span></div><h2>{activity.title}</h2>{activity.instructions && <p className="study-preserve-copy">{activity.instructions}</p>}<p className="study-help">Opens {date(activity.opens_at)}{activity.due_at ? ` · Due ${date(activity.due_at)}` : ''}</p>{activity.saved_at && activity.status !== 'completed' && <p className="study-help">Draft saved {date(activity.saved_at)}</p>}
          {activity.status === 'completed' ? <><p className="study-help">Consent recorded {date(activity.consent_accepted_at)}</p><Button type="button" className="study-secondary" onClick={() => download(activity.receipt, `eduthemes-consent-v${study.version_number}-${activity.id}.json`)} variant="outline" size="auto">Download consent receipt</Button></> : ['available', 'in_progress', 'overdue'].includes(activity.status) ? <Button type="button" className="study-primary" onClick={() => start(activity)} disabled={Boolean(starting) || refreshing} aria-busy={starting === activity.id} variant="default" size="auto">{starting === activity.id ? <><Skeleton className="edu-skeleton--button" />Opening activity…</> : activity.started_at ? 'Resume activity' : 'Start activity'}</Button> : <p className="study-help">{activity.status === 'blocked' ? 'Finish the earlier required activities to unlock this one.' : activity.status === 'upcoming' ? 'Return on the opening day, then refresh your progress.' : 'Contact the study team if you need help.'}</p>}
        </Card>)}</div>
        </div><aside className="participant-hub-aside" aria-label="Study access and information">
        <Card className="study-panel participant-return-panel" as="section"><h2>Your private return link</h2><p>Anyone with this link can open your answers and progress. Keep a private copy; the study team cannot recover a lost key.</p><div className="study-actions"><Button type="button" className="study-secondary" onClick={copyLink} variant="outline" size="auto">Copy private return link</Button><Button type="button" className="study-text-button" onClick={() => download(privateStudyUrl(window.location.origin, accessKey), 'eduthemes-private-study-link.txt', 'text/plain')} variant="link" size="auto">Download private return link</Button></div><Label className="study-consent-choice"><Checkbox type="checkbox" checked={remember} onChange={event => updateRemember(event.target.checked)} /> Remember this link on this browser after I close it.</Label>{storageWarning && <p className="study-note" role="status">This browser could not remember the link. Copy or download it before leaving.</p>}</Card>
        <Card className="study-panel participant-study-details" as="section"><h2>Results from your study</h2><p>Read the study team’s summary when it is released.</p><Button asChild variant="outline"><Link className="study-secondary" to={privateResultsPath({
                p_access_key: accessKey
              })}>Open study results</Link></Button></Card>
        <Card className="study-panel participant-study-details" as="section"><h2>Study information</h2>{study.compensation_details && <><h3>Compensation or course credit</h3><p className="study-preserve-copy">{study.compensation_details}</p></>}<p><strong>Coordinator status:</strong> {rewardLabels[study.reward_status]}</p>{study.contact_info && <><h3>Study contact</h3><p className="study-preserve-copy">{study.contact_info}</p></>}<details><summary>Review the consent for your study version</summary><div className="study-consent-copy">{study.consent_text}</div><p className="study-help">Joined {date(study.joined_at)}</p></details></Card>
      </aside></div>
    </>}
  </main>;
}
