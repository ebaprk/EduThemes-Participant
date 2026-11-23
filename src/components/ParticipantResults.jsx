import { FeatureHelp } from '@eduthemes/ui/components/feature-help';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase, supabaseConfigured } from '../supabase';
import LoadingSkeleton, { Skeleton } from './LoadingSkeleton';
import PortalIcon from './PortalIcon';
import { parseResultsLink, participantResultsText, privateResultsPath, resultsCredentials, resultsSections, resultsSessionKey } from '../utils/participantResults';
import './ParticipantResults.css';
import { Card } from "@eduthemes/ui/components/card";
import { Label } from "@eduthemes/ui/components/label";
import { Input } from "@eduthemes/ui/components/input";
import { Button } from "@eduthemes/ui/components/button";
function initialCredentials(hash) {
  if (hash) return parseResultsLink(hash);
  try {
    return resultsCredentials(JSON.parse(window.sessionStorage.getItem(resultsSessionKey) || 'null'));
  } catch {
    return null;
  }
}
export default function ParticipantResults() {
  const location = useLocation(),
    navigate = useNavigate();
  const [credentials, setCredentials] = useState(() => initialCredentials(location.hash));
  const [input, setInput] = useState(''),
    [data, setData] = useState(null),
    [loading, setLoading] = useState(Boolean(credentials));
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [storageWarning, setStorageWarning] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    if (!location.hash) return;
    const value = parseResultsLink(location.hash);
    setCredentials(value);
    setError(value ? '' : 'That private results link is incomplete. Paste the full link below.');
    if (!value) {
      try {
        window.sessionStorage.removeItem(resultsSessionKey);
      } catch {
        setStorageWarning(true);
      }
    }
    navigate('/results', {
      replace: true
    });
  }, [location.hash, navigate]);
  useEffect(() => {
    if (!credentials) return;
    try {
      window.sessionStorage.setItem(resultsSessionKey, JSON.stringify(credentials));
    } catch {
      setStorageWarning(true);
    }
  }, [credentials]);
  const signature = JSON.stringify(credentials);
  const load = useCallback(async () => {
    if (!credentials || !supabase) {
      setLoading(false);
      return;
    }
    const request = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const {
        data: result,
        error: failure
      } = await supabase.rpc('get_participant_results', credentials);
      if (request !== generation.current) return;
      if (failure) throw failure;
      setData(result);
    } catch (failure) {
      if (request === generation.current) setError(failure.message || 'Could not open your study results.');
    } finally {
      if (request === generation.current) setLoading(false);
    }
    // Credentials are compared by value so stripping the URL fragment keeps the request stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  useEffect(() => {
    setData(null);
    setNotice('');
    load();
    return () => {
      generation.current += 1;
    };
  }, [load]);
  const download = (text, name) => {
    const url = URL.createObjectURL(new Blob([text], {
      type: 'text/plain;charset=utf-8'
    }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };
  const privateLink = credentials ? `${window.location.origin}${privateResultsPath(credentials)}` : '';
  const clearLink = (message = '') => {
    generation.current += 1;
    setCredentials(null);
    setData(null);
    setLoading(false);
    setNotice(message);
    setError('');
    try {
      window.sessionStorage.removeItem(resultsSessionKey);
    } catch {
      setStorageWarning(true);
    }
  };
  const submit = event => {
    event.preventDefault();
    const value = parseResultsLink(input);
    if (!value) {
      setError('Paste a complete private results link or study return link.');
      return;
    }
    setError('');
    setNotice('');
    setLoading(true);
    setCredentials(value);
    setInput('');
  };

  return <main className="study-shell participant-shell participant-portal-page participant-results-shell">
    <header className="participant-page-heading">
      {data && <Link className="portal-back-link" to="/my-studies"><PortalIcon name="arrow-left" />My studies</Link>}
      {data ? (
        <div className="participant-results-heading">
          <div>
            <h1>{data.study_title}</h1>
            <p className="study-version-label">Study version {data.version_number}{data.release && ` · Results release ${data.release.release_number}`}</p>
          </div>
          <Button className="study-secondary" disabled={loading} aria-busy={loading} onClick={load} variant="outline" size="auto">
            {loading ? <><Skeleton className="edu-skeleton--button" />Checking for updates…</> : 'Check for updates'}
          </Button>
        </div>
      ) : (
        <>
          <h1>Study results</h1>
          {!credentials && <p>Read the results your study team has shared with participants.</p>}
        </>
      )}
      <FeatureHelp audience="participant" guide="view-results" label="Help with viewing results" />
    </header>
    {notice && <p className="study-note" role="status">{notice}</p>}
    {!credentials ? (
      <form className="study-panel portal-entry-form" onSubmit={submit}>
        <Label htmlFor="results-private-link">Results or study return link</Label>
        <div className="portal-entry-controls">
          <Input id="results-private-link" type="password" autoComplete="off" spellCheck={false}
            value={input} onChange={event => {
              setInput(event.target.value);
              setError('');
            }}
            aria-invalid={Boolean(error)} aria-describedby={error ? 'results-link-error' : 'results-link-help'} required />
          <Button className="study-primary" type="submit" size="auto">View results<PortalIcon name="arrow" /></Button>
        </div>
        {error ? <p className="study-error" id="results-link-error" role="alert">{error}</p> :
          <p className="study-help" id="results-link-help">Use the private link saved when you joined or submitted your responses.</p>}
      </form>
    ) : !supabaseConfigured ? (
      <p className="study-error" role="alert">This site has not been connected to its study service.</p>
    ) : !data ? (
      loading ? <LoadingSkeleton variant="form" rows={2} label="Opening your study results…" /> :
        <div className="study-panel participant-results-message">
          {error && <p className="study-error" role="alert">{error}</p>}
          <div className="study-actions">
            <Button className="study-primary" onClick={load} size="auto">Try again</Button>
            <Button onClick={() => clearLink()} variant="outline" size="auto">Use a different link</Button>
          </div>
        </div>
    ) : (
      <>
        {error && <p className="study-error" role="alert">{error} Showing the last loaded results.</p>}
        {data.release ? (
          <Card className="study-panel participant-results-document" as="article">
            <header>
              <h2>{data.release.content.title}</h2>
              <p className="study-help">Released {new Date(data.release.released_at).toLocaleString()}</p>
            </header>
            {resultsSections.map(([key, label]) => data.release.content[key] && <section key={key}>
              <h3>{label}</h3>
              <p>{data.release.content[key]}</p>
            </section>)}
            <Button className="study-secondary" disabled={loading}
              onClick={() => download(participantResultsText(data), `eduthemes-results-v${data.version_number}-release${data.release.release_number}.txt`)}
              variant="outline" size="auto">Download summary</Button>
          </Card>
        ) : (
          <Card className="study-panel participant-results-message" as="section">
            <h2>No results have been shared yet</h2>
            <p>Save your private link to check back later. Some studies may never share a summary.</p>
            {data.contact_info && <><h3>Study contact</h3><p className="study-preserve-copy">{data.contact_info}</p></>}
          </Card>
        )}
        <section className="participant-results-access" aria-labelledby="results-access-heading">
          <h2 id="results-access-heading">Your private results link</h2>
          <p>This tab remembers the link until you close it. Download a copy to return later.</p>
          <div className="study-actions">
            <Button onClick={() => download(privateLink, 'eduthemes-private-results-link.txt')} variant="outline" size="auto">Download private link</Button>
            <Button onClick={() => clearLink('Results link removed from this tab. Any downloaded copies remain on your device.')} variant="ghost" size="auto">Forget link in this tab</Button>
          </div>
          {storageWarning && <p className="study-note" role="status">This browser could not save your link for this session. Download it before leaving.</p>}
        </section>
      </>
    )}
  </main>;
}
