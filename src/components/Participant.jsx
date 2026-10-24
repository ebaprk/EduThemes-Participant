import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase, supabaseConfigured } from '../supabase';
import CanvasConnection, { useCanvas } from './CanvasConnection';
import { clearSubmissionRequestId, submissionRequestId, submitCanvasStudy } from '../utils/canvas';
import './Studies.css';

export default function Participant() {
  const { code } = useParams();
  const navigate = useNavigate();
  const canvas = useCanvas();
  const [shareDetails, setShareDetails] = useState(false);
  const [entryCode, setEntryCode] = useState('');
  const [study, setStudy] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(Boolean(code));
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setAnswers({});
    setFinished(false);
    setShareDetails(false);
    if (!code || !supabase) return;
    let active = true;
    setLoading(true);
    setStudy(null);
    setError('');
    supabase.rpc('get_public_study', { p_code: code }).then(({ data, error: loadError }) => {
      if (!active) return;
      setLoading(false);
      if (loadError) setError(loadError.message);
      else if (!data) setError('This study link is unavailable or the study is closed.');
      else setStudy(data);
    });
    return () => { active = false; };
  }, [code]);

  useEffect(() => { setShareDetails(false); }, [canvas.participant]);

  const submit = async (event) => {
    event.preventDefault();
    if (!study || submitting || canvas.loading || canvas.error) return;
    setError('');
    setSubmitting(true);
    try {
      if (canvas.participant) {
        if (!shareDetails) throw new Error('Confirm sharing your Canvas details before submitting.');
        await submitCanvasStudy(code, answers, submissionRequestId(code));
        // Clear only after a confirmed response so network retries are idempotent.
        try { clearSubmissionRequestId(code); } catch { /* Submission already succeeded. */ }
      } else {
        const { error: submitError } = await supabase.rpc('submit_study', { p_code: code, p_answers: answers });
        if (submitError) throw submitError;
      }
      setFinished(true);
    } catch (failure) { setError(failure.message || 'Could not submit. Your answers are still here; please try again.'); }
    finally { setSubmitting(false); }
  };

  if (!code) return (
    <main className="study-shell participant-shell">
      <span className="study-eyebrow">Participant portal</span>
      <h1>Join a study</h1>
      <p>Enter the code your researcher shared with you.</p>
      <CanvasConnection />
      <form className="study-panel join-form" onSubmit={(event) => {
        event.preventDefault();
        navigate(`/join/${entryCode.trim().toUpperCase()}`);
      }}>
        <label htmlFor="study-code">Study code</label>
        <input id="study-code" value={entryCode} onChange={(event) => setEntryCode(event.target.value)} required maxLength={12} autoComplete="off" placeholder="12-character code" />
        <button className="study-primary" type="submit">Continue</button>
      </form>
    </main>
  );

  return (
    <main className="study-shell participant-shell">
      <span className="study-eyebrow">Participant portal</span>
      {!supabaseConfigured ? <p role="alert">This site has not been connected to Supabase yet.</p>
        : loading ? <p role="status">Loading study…</p>
          : finished ? (
            <section className="study-panel" role="status">
              <h1>Thank you for participating</h1>
              <p>Your responses were submitted successfully.</p>
              <Link to="/">Join another study</Link>
            </section>
          ) : study ? (
            <>
              <h1>{study.title}</h1>
              {study.description && <p className="study-intro">{study.description}</p>}
              <p className="study-privacy">Your answers{canvas.participant ? ' and the Canvas details shown below' : ''} are shared with the researcher who created this study.</p>
              <CanvasConnection />
              <form className="study-panel participant-form" onSubmit={submit}>
                {(study.questions || []).map((question, index) => (
                  <div className="study-field" key={question.id}>
                    <label htmlFor={`answer-${question.id}`}>{index + 1}. {question.prompt}</label>
                    <textarea
                      id={`answer-${question.id}`}
                      value={answers[question.id] || ''}
                      onChange={(event) => setAnswers((previous) => ({ ...previous, [question.id]: event.target.value }))}
                      rows={5}
                      maxLength={10000}
                      required
                    />
                  </div>
                ))}
                {canvas.participant && <label className="canvas-consent"><input type="checkbox" checked={shareDetails} onChange={(event) => setShareDetails(event.target.checked)} required /> I agree to include the Canvas details shown above with my answers to this study.</label>}
                {error && <p className="study-error" role="alert">{error}</p>}
                <button className="study-primary" type="submit" disabled={submitting || canvas.loading || Boolean(canvas.error) || (Boolean(canvas.participant) && !shareDetails)}>
                  {submitting ? 'Submitting…' : 'Submit responses'}
                </button>
              </form>
            </>
          ) : <section className="study-panel"><h1>Study unavailable</h1><p role="alert">{error}</p><Link to="/">Enter another code</Link></section>}
    </main>
  );
}
