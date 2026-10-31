import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { Skeleton } from './LoadingSkeleton';
import './StudySlides.css';

export function StudySlide({ studyTitle, context, slideKey, progress = 0, total = 1, progressLabel, footer, children, direction = 'forward' }) {
  const content = useRef(null);
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    content.current?.querySelector('[data-slide-heading]')?.focus({ preventScroll: true });
  }, [slideKey]);

  return <section className="study-slides" aria-label={context}>
    <header className="study-slides__header">
      <div><span className="study-slides__context">{context}</span><p>{studyTitle}</p></div>
      {progressLabel && <div className="study-slides__progress"><span>{progressLabel}</span><progress max={total || 1} value={progress} aria-label={progressLabel} /></div>}
    </header>
    <div className="study-slides__body">
      <div className={`study-slides__content study-slides__content--${direction}`} key={slideKey} ref={content}>{children}</div>
    </div>
    {footer && <footer className="study-slides__footer">{footer}</footer>}
  </section>;
}

export function StudyInformation({ study, children }) {
  return <details className="study-slides__information">
    <summary>Study information</summary>
    <div>
      {study.description && <p className="study-preserve-copy">{study.description}</p>}
      {study.contact_info && <p className="study-preserve-copy"><strong>Study contact:</strong> {study.contact_info}</p>}
      {study.compensation_details && <p className="study-preserve-copy"><strong>Compensation or course credit:</strong> {study.compensation_details}</p>}
      <p className="study-help">Study version {study.version_number}</p>
      {children}
    </div>
  </details>;
}

export default function StudyQuestionSlides({ studyTitle, context, questions, answers, onChange, onSubmit, onPrevious,
  submitting = false, busy = false, blocked = false, submitDisabled = false, submitLabel = 'Submit responses',
  status, notices, information, error }) {
  const formId = useId();
  const [index, setIndex] = useState(() => {
    const firstEmpty = questions.findIndex((question) => !answers[question.id]?.trim());
    return firstEmpty < 0 ? Math.max(0, questions.length - 1) : firstEmpty;
  });
  const [direction, setDirection] = useState('forward');
  const [validation, setValidation] = useState('');
  const [editing, setEditing] = useState(false);
  const input = useRef(null);
  const review = index >= questions.length;
  const question = questions[index];
  const completed = questions.filter((item) => answers[item.id]?.trim()).length;
  const disabled = submitting || busy;
  const answerId = `${formId}-answer`;
  const move = (next) => {
    setDirection(next < index ? 'backward' : 'forward');
    setValidation(''); setIndex(next);
  };
  const advance = (event) => {
    event.preventDefault();
    if (disabled || blocked) return;
    if (!review) {
      if (!answers[question.id]?.trim()) {
        setValidation('Please add your answer before continuing.'); input.current?.focus(); return;
      }
      move(editing ? questions.length : index + 1); setEditing(false);
      return;
    }
    const missing = questions.findIndex((item) => !answers[item.id]?.trim());
    if (missing >= 0) { move(missing); setEditing(false); return; }
    if (!submitDisabled && questions.length) onSubmit(event);
  };
  const back = () => {
    setEditing(false);
    if (index > 0) move(index - 1); else onPrevious?.();
  };

  return <StudySlide studyTitle={studyTitle} context={context} slideKey={review ? 'review' : question.id}
    progress={completed} total={questions.length} progressLabel={`${completed} of ${questions.length} answered`} direction={direction}
    footer={<>
      <div className="study-slides__footer-note">{status || <span>Your answers stay editable until you submit.</span>}</div>
      <div className="study-slides__navigation">
        <button type="button" className="study-slides__back" onClick={back} disabled={disabled || (index === 0 && !onPrevious)} aria-label={review ? 'Back to last question' : index === 0 ? 'Back to study introduction' : 'Previous question'}><span aria-hidden="true">←</span> Back</button>
        <button type="submit" form={formId} className="study-primary study-slides__next" disabled={disabled || blocked || (review && (submitDisabled || !questions.length))} aria-busy={submitting}>
          {submitting ? <><Skeleton className="edu-skeleton--button" />Submitting…</> : review ? submitLabel : <>{editing ? 'Back to review' : index === questions.length - 1 ? 'Review answers' : 'Next'}<span aria-hidden="true">→</span></>}
        </button>
      </div>
    </>}>
    <form id={formId} onSubmit={advance} noValidate onKeyDown={(event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing) {
        event.preventDefault(); if (!review) advance(event);
      }
    }} aria-busy={submitting}>
      {review ? <>
        <span className="study-slides__eyebrow">One last look</span>
        <h1 data-slide-heading tabIndex={-1}>Ready when you are.</h1>
        <p className="study-slides__description">Review your answers below. You can change anything before you submit.</p>
        <ol className="study-slides__review">{questions.map((item, position) => <li key={item.id}>
          <div><span className="study-slides__review-number" aria-hidden="true">{position + 1}</span><h2>{item.prompt}</h2><button type="button" className="study-text-button" disabled={disabled || blocked} aria-label={`Edit answer ${position + 1}`} onClick={() => { setEditing(true); move(position); }}>Edit</button></div>
          <p>{answers[item.id]}</p>
        </li>)}</ol>
      </> : <>
        <span className="study-slides__eyebrow">Question {index + 1} <span aria-hidden="true">/</span><span className="study-slides__total"> {questions.length}</span></span>
        <h1 data-slide-heading tabIndex={-1}><label htmlFor={answerId}>{question.prompt}</label></h1>
        <div className="study-slides__answer">
          <textarea ref={input} id={answerId} value={answers[question.id] || ''} onChange={(event) => { setValidation(''); onChange(question.id, event.target.value); }}
            rows={5} maxLength={10000} required disabled={disabled || blocked} placeholder="Your thoughts go here…" aria-invalid={Boolean(validation)}
            aria-describedby={`${answerId}-hint${validation ? ` ${answerId}-error` : ''}`} />
          <div className="study-slides__answer-meta"><span id={`${answerId}-hint`}>A few words or a longer reflection. Enter adds a new line.</span><span>{(answers[question.id] || '').length.toLocaleString()} / 10,000</span></div>
        </div>
        {validation && <p id={`${answerId}-error`} className="study-error" role="alert">{validation}</p>}
        <p className="study-slides__keyboard">To continue, click {editing ? 'Back to review' : index === questions.length - 1 ? 'Review answers' : 'Next'} or press <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>Enter</kbd></p>
      </>}
      {notices}
      {error && <p className="study-error" role="alert">{error}</p>}
    </form>
    {information}
  </StudySlide>;
}
