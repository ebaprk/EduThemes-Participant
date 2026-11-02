import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase, supabaseConfigured } from '../supabase';
import LoadingSkeleton, { Skeleton } from './LoadingSkeleton';
import { parseResultsLink, participantResultsText, privateResultsPath, resultsCredentials, resultsSections, resultsSessionKey } from '../utils/participantResults';
import './ParticipantResults.css';

function initialCredentials(hash) {
  if (hash) return parseResultsLink(hash);
  try { return resultsCredentials(JSON.parse(window.sessionStorage.getItem(resultsSessionKey) || 'null')); } catch { return null; }
}
export default function ParticipantResults() {
  const location = useLocation(), navigate = useNavigate();
  const [credentials, setCredentials] = useState(() => initialCredentials(location.hash));
  const [input, setInput] = useState(''), [data, setData] = useState(null), [loading, setLoading] = useState(Boolean(credentials));
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [storageWarning, setStorageWarning] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    if (!location.hash) return;
    const value = parseResultsLink(location.hash);
    setCredentials(value); setData(null); setError(value ? '' : 'That private results link is incomplete. Paste the full link below.');
    if (!value) { try { window.sessionStorage.removeItem(resultsSessionKey); } catch { setStorageWarning(true); } }
    navigate('/results', { replace: true });
  }, [location.hash, navigate]);
  useEffect(() => {
    if (!credentials) return;
    try { window.sessionStorage.setItem(resultsSessionKey, JSON.stringify(credentials)); } catch { setStorageWarning(true); }
  }, [credentials]);
  const signature = JSON.stringify(credentials);
  const load = useCallback(async () => {
    if (!credentials || !supabase) { setLoading(false); return; }
    const request = ++generation.current; setLoading(true); setError('');
    try {
      const { data: result, error: failure } = await supabase.rpc('get_participant_results', credentials);
      if (request !== generation.current) return;
      if (failure) throw failure;
      setData(result);
    } catch (failure) { if (request === generation.current) setError(failure.message || 'Could not open your study results.'); }
    finally { if (request === generation.current) setLoading(false); }
  // Credentials are compared by value so stripping the URL fragment keeps the request stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  useEffect(() => { setData(null); setNotice(''); load(); return () => { generation.current += 1; }; }, [load]);
  const download = (text, name) => { const url = URL.createObjectURL(new Blob([text], { type:'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); };
  const privateLink = credentials ? `${window.location.origin}${privateResultsPath(credentials)}` : '';
  const forget = () => { generation.current += 1; setCredentials(null); setData(null); setLoading(false); setNotice('Results link removed from this tab’s saved session. Downloaded copies remain where you saved them.'); setError(''); try { window.sessionStorage.removeItem(resultsSessionKey); } catch { setStorageWarning(true); } };
  return <main className="study-shell participant-shell participant-results-shell"><Link className="participant-results-back" to="/my-studies">← My studies</Link><span className="study-eyebrow">Closing the research loop</span><h1>Study results</h1>
    {error && <p className="study-error" role="alert">{error}</p>}{notice && <p className="study-note" role="status">{notice}</p>}
    {!credentials ? <section className="study-panel"><h2>Open your private results link</h2><p>Use the link saved after submitting your responses, or your private study return link.</p><form onSubmit={event => { event.preventDefault(); const value = parseResultsLink(input); if (!value) { setError('Paste a complete private results link or study return link.'); return; } setError(''); setNotice(''); setCredentials(value); setInput(''); }}><div className="study-field"><label htmlFor="results-private-link">Private results or study return link</label><input type="password" id="results-private-link" autoComplete="off" spellCheck={false} value={input} onChange={event => setInput(event.target.value)} required /></div><button className="study-primary" type="submit">Open study results</button></form></section>
      : !supabaseConfigured ? <p className="study-error" role="alert">This site has not been connected to its study service.</p> : !data ? loading ? <LoadingSkeleton variant="form" rows={2} label="Opening your study results…" /> : <button className="study-primary" onClick={load}>Try opening results again</button> : <>
        <header className="study-panel participant-results-heading"><div><h2>{data.study_title}</h2><p className="study-version-label">Your study version {data.version_number}{data.release ? ` · Results release ${data.release.release_number}` : ''}</p></div><button className="study-secondary" disabled={loading} aria-busy={loading} onClick={load}>{loading ? <><Skeleton className="edu-skeleton--button" />Refreshing…</> : 'Check for updates'}</button></header>
        {loading && <LoadingSkeleton variant="inline" label="Checking for an updated results release…" />}{error && data && <p className="study-note">Showing the last successfully loaded summary. Check again for the current release.</p>}
        {data.release ? <article className="study-panel participant-results-document"><span className="study-eyebrow">A message from your study team</span><h2>{data.release.content.title}</h2><p className="study-help">Released {new Date(data.release.released_at).toLocaleString()}</p>{resultsSections.map(([key, label]) => data.release.content[key] && <section key={key}><h3>{label}</h3><p>{data.release.content[key]}</p></section>)}<button className="study-secondary" disabled={loading} onClick={() => download(participantResultsText(data), `eduthemes-results-v${data.version_number}-release${data.release.release_number}.txt`)}>Download this results summary</button></article>
          : <section className="study-panel participant-results-empty"><h2>No results summary is currently released</h2><p>The study team may still be preparing the findings or revising a previous summary. Save your private link and check back later. A summary may not be released for every study.</p>{data.contact_info && <><h3>Study contact</h3><p className="study-preserve-copy">{data.contact_info}</p></>}</section>}
      </>}
    {credentials && <section className="study-panel participant-results-access"><h2>Keep your way back</h2><p>This private link opens the results for your original study version, even after collection closes. It is saved only for this browser tab’s session. Keep a copy somewhere private to return later.</p><div className="study-actions"><button className="study-secondary" onClick={() => download(privateLink, 'eduthemes-private-results-link.txt')}>Download private results link</button><button className="study-text-button" onClick={forget}>Forget results link in this tab</button></div>{storageWarning && <p className="study-note" role="status">This browser could not save your link for this session. Download it before leaving.</p>}</section>}
  </main>;
}
