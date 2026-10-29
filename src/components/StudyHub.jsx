import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase, supabaseConfigured } from '../supabase';
import LoadingSkeleton, { Skeleton } from './LoadingSkeleton';
import StudyActivityForm from './StudyActivityForm';
import { browserStorage, parseStudyKey, persistentStudyLinks, privateStudyUrl, readStudyLinks,
  removeStudyLink, sessionStudyLinks, storeStudyLink } from '../utils/studyHub';
import './Studies.css';

const rewardLabels = { not_recorded: 'No status recorded yet', not_applicable: 'Not applicable', awaiting_completion: 'Awaiting completion',
  ready: 'Ready for coordinator handoff', handed_off: 'Handed off to the existing process', confirmed: 'Confirmed by the study coordinator' };
const statusLabels = { completed: 'Completed', paused: 'Study paused', blocked: 'Complete earlier required activities first', upcoming: 'Opens later',
  overdue: 'Past due · still open', in_progress: 'Draft in progress', available: 'Ready to begin' };
const date = (value) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

function savedStudies() {
  const records = [...readStudyLinks(browserStorage('sessionStorage'), sessionStudyLinks), ...readStudyLinks(browserStorage('localStorage'), persistentStudyLinks)];
  return [...new Map(records.map((record) => [record.key, record])).values()];
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
  const generation = useRef(0);
  const currentKey = useRef(accessKey);
  currentKey.current = accessKey;

  useEffect(() => {
    if (!location.hash) return;
    const key = parseStudyKey(location.hash);
    if (key) { setAccessKey(key); setEditor(null); setError(''); }
    else setError('That private return link is incomplete. Paste the full link or study key below.');
    navigate('/my-studies', { replace: true });
  }, [location.hash, navigate]);
  const load = useCallback(async (initial = false) => {
    if (!accessKey || !supabase) return;
    const request = ++generation.current;
    if (initial) setLoading(true); else setRefreshing(true);
    try {
      const { data, error: failure } = await supabase.rpc('get_participant_study', { p_access_key: accessKey });
      if (request !== generation.current) return;
      if (failure) throw failure;
      setStudy(data);
      const record = { key: accessKey, title: data.title, version: data.version_number, reference: data.participant_reference };
      const remembered = readStudyLinks(browserStorage('localStorage'), persistentStudyLinks).some((item) => item.key === accessKey);
      if (initial) setRemember(remembered);
      try {
        storeStudyLink(browserStorage('sessionStorage'), sessionStudyLinks, record);
        if (remembered) storeStudyLink(browserStorage('localStorage'), persistentStudyLinks, record);
      } catch { setStorageWarning(true); }
      setLinks(savedStudies());
    } catch (failure) { if (request === generation.current) setError(failure.message || 'Could not open your private study.'); }
    finally { if (request === generation.current) { setResolvedKey(accessKey); setLoading(false); setRefreshing(false); } }
  }, [accessKey]);
  useEffect(() => { setStudy(null); setEditor(null); setError(''); setNotice(''); if (accessKey) load(true); else setLoading(false); return () => { generation.current += 1; }; }, [load, accessKey]);
  const open = (key) => { setAccessKey(key); setEditor(null); setError(''); setNotice(''); };
  const backToList = () => { setAccessKey(null); setStudy(null); setEditor(null); setStarting(null); setError(''); setNotice(''); setLinks(savedStudies()); };
  const updateRemember = (checked) => {
    setRemember(checked);
    try {
      if (checked) storeStudyLink(browserStorage('localStorage'), persistentStudyLinks, { key: accessKey, title: study.title, version: study.version_number, reference: study.participant_reference });
      else removeStudyLink(browserStorage('localStorage'), persistentStudyLinks, accessKey);
      setLinks(savedStudies());
    } catch { setStorageWarning(true); setRemember(false); }
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(privateStudyUrl(window.location.origin, accessKey)); setNotice('Private return link copied. Keep it somewhere only you can access.'); }
    catch { setError('Could not copy the link. Download it instead.'); }
  };
  const download = (content, filename, type = 'application/json') => {
    const url = URL.createObjectURL(new Blob([type === 'application/json' ? JSON.stringify(content, null, 2) : content], { type }));
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
  };
  const start = async (activity) => {
    if (starting) return;
    const key = accessKey;
    setStarting(activity.id); setError(''); setNotice('');
    try {
      const { data, error: failure } = await supabase.rpc('start_study_activity', { p_access_key: key, p_activity_id: activity.id });
      if (key !== currentKey.current) return;
      if (failure) throw failure;
      setEditor({ activity, progress: data });
    } catch (failure) { if (key === currentKey.current) setError(failure.message || 'Could not start this activity.'); }
    finally { if (key === currentKey.current) setStarting(null); }
  };
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [resolvedKey, editor?.activity.id]);
  const required = study?.activities.filter((activity) => activity.required) || [];
  const completed = required.filter((activity) => activity.status === 'completed').length;

  return <main className={`study-shell participant-shell participant-hub${study && !editor ? ' participant-hub--wide' : ''}`}>
    <span className="study-eyebrow">My studies</span>
    {!accessKey ? <><h1>Your next activity starts here</h1><p>Open a saved study, or paste the private return link you received when you joined.</p>
      {error && <p className="study-error" role="alert">{error}</p>}
      <form className="study-panel join-form" onSubmit={(event) => { event.preventDefault(); const key = parseStudyKey(linkInput); if (key) { open(key); setLinkInput(''); } else setError('Paste a complete private return link or a 64-character study key.'); }}><label htmlFor="private-study-link">Private return link or study key</label><input id="private-study-link" type="password" autoComplete="off" spellCheck={false} value={linkInput} onChange={(event) => setLinkInput(event.target.value)} required /><button type="submit" className="study-primary">Open my study</button></form>
      {links.length ? <section className="participant-saved-studies"><h2>Saved in this browser</h2>{links.map((item) => <article className="study-panel participant-saved-study" key={item.key}><span className="study-version-label">Version {item.version} · {item.reference}</span><h3>{item.title}</h3><button type="button" className="study-secondary" onClick={() => open(item.key)}>Open activities</button></article>)}</section> : <section className="study-panel participant-saved-study"><h2>No saved return links yet</h2><p>After you join a study with multiple activities, its private return link will open your progress here.</p><Link to="/">Join a study with a researcher’s code</Link></section>}
    </> : !supabaseConfigured ? <p className="study-error" role="alert">This site has not been connected to its study service.</p> : loading || resolvedKey !== accessKey ? <LoadingSkeleton variant="study" rows={2} label="Opening your private study and saved progress…" /> : !study ? <><h1>Open your private study</h1>{error && <p className="study-error" role="alert">{error}</p>}<div className="study-actions"><button type="button" className="study-primary" onClick={() => { setError(''); load(true); }}>Try again</button><button type="button" className="study-text-button" onClick={backToList}>Return to saved studies</button></div></> : <>
      <button type="button" className="study-text-button" disabled={Boolean(editor) || Boolean(starting)} onClick={backToList}>← Saved studies</button>
      <h1>{study.title}</h1><p className="study-version-label">Version {study.version_number} · Your reference: {study.participant_reference}</p>
      {error && <p className="study-error" role="alert">{error}</p>}{notice && <p className="study-note" role="status">{notice}</p>}
      {editor ? <StudyActivityForm key={`${accessKey}.${editor.activity.id}`} accessKey={accessKey} study={study} activity={editor.activity} progress={editor.progress}
        onBack={async () => { setEditor(null); await load(); }} onDone={async () => { setEditor(null); setNotice('Activity submitted. Its consent receipt is available below.'); await load(); }} /> : <div className="participant-hub-workspace"><div className="participant-hub-content">
        <section className="study-panel participant-progress-panel"><div className="participant-progress-heading"><div><h2>{completed === required.length ? 'Required activities complete' : 'Your study progress'}</h2><p>{completed} of {required.length} required activities completed</p></div><button type="button" className="study-text-button" disabled={refreshing || Boolean(starting)} onClick={() => { setError(''); load(); }}>Refresh progress</button></div><progress max={required.length || 1} value={completed} aria-label="Required activity completion" />{study.study_status !== 'open' && <p className="study-note">The study team has paused or closed participation. Your saved work and receipts remain available.</p>}{refreshing && <LoadingSkeleton variant="inline" label="Refreshing your study progress…" />}</section>
        {starting ? <LoadingSkeleton variant="form" rows={1} label="Opening your activity and saved draft…" /> : <div className="participant-activity-list">{study.activities.map((activity) => <article className={`study-panel participant-activity-card is-${activity.status}`} key={activity.id}><div className="participant-activity-heading"><span className="study-version-label">{activity.required ? 'Required' : 'Optional'} activity</span><span className="participant-activity-status">{statusLabels[activity.status]}</span></div><h2>{activity.title}</h2>{activity.instructions && <p className="study-preserve-copy">{activity.instructions}</p>}<p className="study-help">Opens {date(activity.opens_at)}{activity.due_at ? ` · Due ${date(activity.due_at)}` : ''}</p>{activity.saved_at && activity.status !== 'completed' && <p className="study-help">Draft saved {date(activity.saved_at)}</p>}
          {activity.status === 'completed' ? <><p className="study-help">Consent recorded {date(activity.consent_accepted_at)}</p><button type="button" className="study-secondary" onClick={() => download(activity.receipt, `eduthemes-consent-v${study.version_number}-${activity.id}.json`)}>Download consent receipt</button></> : ['available','in_progress','overdue'].includes(activity.status) ? <button type="button" className="study-primary" onClick={() => start(activity)} disabled={Boolean(starting) || refreshing}>{activity.started_at ? 'Resume activity' : 'Start activity'}</button> : <p className="study-help">{activity.status === 'blocked' ? 'Finish the earlier required activities to unlock this one.' : activity.status === 'upcoming' ? 'Return on the opening day, then refresh your progress.' : 'Contact the study team if you need help.'}</p>}
        </article>)}</div>}
        </div><aside className="participant-hub-aside" aria-label="Study access and information">
        <section className="study-panel participant-return-panel"><h2>Your private return link</h2><p>This link opens your saved answers and progress. Keep it private and save a copy; the study team cannot recover a lost private key. You can use the link on another device without creating an account.</p><div className="study-actions"><button type="button" className="study-secondary" onClick={copyLink}>Copy private return link</button><button type="button" className="study-text-button" onClick={() => download(privateStudyUrl(window.location.origin, accessKey), 'eduthemes-private-study-link.txt', 'text/plain')}>Download private return link</button></div><label className="study-consent-choice"><input type="checkbox" checked={remember} onChange={(event) => updateRemember(event.target.checked)} /> Remember this link on this browser after I close it.</label>{storageWarning && <p className="study-note" role="status">This browser could not remember the link. Copy or download it before leaving.</p>}</section>
        <section className="study-panel participant-study-details"><h2>Study information</h2>{study.compensation_details && <><h3>Compensation or course credit</h3><p className="study-preserve-copy">{study.compensation_details}</p></>}<p><strong>Coordinator status:</strong> {rewardLabels[study.reward_status]}</p>{study.contact_info && <><h3>Study contact</h3><p className="study-preserve-copy">{study.contact_info}</p></>}<details><summary>Review the consent for your study version</summary><div className="study-consent-copy">{study.consent_text}</div><p className="study-help">Joined {date(study.joined_at)}</p></details></section>
      </aside></div>}
    </>}
  </main>;
}
