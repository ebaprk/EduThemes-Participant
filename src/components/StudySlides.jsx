import { FeatureHelp } from '@eduthemes/ui/components/feature-help';
import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Skeleton } from './LoadingSkeleton';
import PortalIcon from './PortalIcon';
import './StudySlides.css';
import { Progress } from "@eduthemes/ui/components/progress";
import { Button } from "@eduthemes/ui/components/button";
import { Card, CardContent, CardFooter } from "@eduthemes/ui/components/card";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@eduthemes/ui/components/sheet";
import { Textarea } from "@eduthemes/ui/components/textarea";
export function StudySlide({
  studyTitle,
  context,
  slideKey,
  progress = 0,
  total = 1,
  progressLabel,
  stepLabel,
  actions,
  information,
  children,
  variant = 'card',
  className = '',
  direction = 'forward',
  helpGuide
}) {
  const content = useRef(null);
  useLayoutEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
    content.current?.querySelector('[data-slide-heading]')?.focus({
      preventScroll: true
    });
  }, [slideKey]);
  const Surface = variant === 'question' ? 'div' : Card;
  return <section className={`study-slides study-slides--${variant}${className ? ` ${className}` : ''}`} aria-label={context}>
    {information}
    <div className="study-slides__frame" key={slideKey} ref={content} data-direction={direction}>
      <Surface className="study-slides__surface">
        <CardContent className="study-slides__content">
          {studyTitle && <p className="study-slides__study-title">{studyTitle}</p>}
          {progressLabel && <div className="study-slides__progress">
            <span>{stepLabel || progressLabel}</span>
            <Progress max={total || 1} value={progress} aria-label={progressLabel} />
          </div>}
          {children}
          {helpGuide && <FeatureHelp audience="participant" guide={helpGuide} label="Help with this step" />}
        </CardContent>
        {actions && <CardFooter className="study-slides__actions">{actions}</CardFooter>}
      </Surface>
    </div>
  </section>;
}
export function StudyInformation({
  study,
  showDescription = true,
  children
}) {
  const [toolbar, setToolbar] = useState(null);
  const title = useRef(null);
  useLayoutEffect(() => {
    setToolbar(document.getElementById('study-information-toolbar'));
  }, []);

  const { description, contact_info, compensation_details, version_number } = study;
  if (!toolbar) return null;

  return createPortal(<Sheet>
    <SheetTrigger asChild>
      <Button className="portal-study-information-button" variant="ghost" size="auto" aria-label="Study information">
        <PortalIcon name="info" />
        <span className="portal-study-information-label">Study information</span>
        <span className="portal-study-information-short" aria-hidden="true">Study info</span>
      </Button>
    </SheetTrigger>
    <SheetContent className="study-information-drawer" showCloseButton={false} onOpenAutoFocus={event => {
      event.preventDefault();
      title.current?.focus();
    }}>
      <SheetHeader className="study-information-drawer__header">
        <SheetTitle ref={title} tabIndex={-1}>Study information</SheetTitle>
        <SheetDescription>{study.title || 'Details about this study'}</SheetDescription>
        <SheetClose asChild>
          <Button variant="ghost" size="icon" aria-label="Close study information"><PortalIcon name="close" /></Button>
        </SheetClose>
      </SheetHeader>
      <div className="study-information-drawer__body">
        {showDescription && description && <p className="study-preserve-copy">{description}</p>}
        {(contact_info || compensation_details) && <dl>
          {contact_info && <div><dt>Study contact</dt><dd className="study-preserve-copy">{contact_info}</dd></div>}
          {compensation_details && <div><dt>Compensation or course credit</dt><dd className="study-preserve-copy">{compensation_details}</dd></div>}
        </dl>}
        {version_number != null && <p className="study-help">Study version {version_number}</p>}
        {children}
        <FeatureHelp audience="participant" guide="consent-and-privacy" label="Help with consent and study information" />
      </div>
    </SheetContent>
  </Sheet>, toolbar);
}
export default function StudyQuestionSlides({
  studyTitle,
  context,
  questions,
  answers,
  onChange,
  onSubmit,
  onPrevious,
  submitting = false,
  busy = false,
  blocked = false,
  submitDisabled = false,
  submitLabel = 'Submit responses',
  status,
  notices,
  information,
  error,
  helpGuide = 'answer-and-submit'
}) {
  const formId = useId();
  const [index, setIndex] = useState(() => {
    const firstEmpty = questions.findIndex(question => !answers[question.id]?.trim());
    return firstEmpty < 0 ? Math.max(0, questions.length - 1) : firstEmpty;
  });
  const [direction, setDirection] = useState('forward');
  const [validation, setValidation] = useState('');
  const [editing, setEditing] = useState(false);
  const input = useRef(null);
  const review = index >= questions.length;
  const question = questions[index];
  const completed = questions.filter(item => answers[item.id]?.trim()).length;
  const disabled = submitting || busy;
  const answerId = `${formId}-answer`;
  const promptId = `${formId}-prompt`;
  const move = next => {
    setDirection(next < index ? 'backward' : 'forward');
    setValidation('');
    setIndex(next);
  };
  const advance = event => {
    event.preventDefault();
    if (disabled || blocked) return;
    if (!review) {
      if (!answers[question.id]?.trim()) {
        setValidation('Please add your answer before continuing.');
        input.current?.focus();
        return;
      }
      move(editing ? questions.length : index + 1);
      setEditing(false);
      return;
    }
    const missing = questions.findIndex(item => !answers[item.id]?.trim());
    if (missing >= 0) {
      move(missing);
      setEditing(false);
      return;
    }
    if (!submitDisabled && questions.length) onSubmit(event);
  };
  const back = () => {
    setEditing(false);
    if (index > 0) move(index - 1);else onPrevious?.();
  };
  return <StudySlide
    studyTitle={studyTitle}
    context={context}
    slideKey={review ? 'review' : question.id}
    helpGuide={`${helpGuide}${helpGuide === 'answer-and-submit' ? review ? '#review' : '#answer' : ''}`}
    variant={review ? 'card' : 'question'}
    progress={completed}
    total={questions.length}
    progressLabel={`${completed} of ${questions.length} answered`}
    stepLabel={review ? undefined : `Question ${index + 1} of ${questions.length}`}
    direction={direction}
    information={information}
    actions={<>
      <div className="study-slides__navigation">
        {!editing && <Button type="button" className="study-slides__back" onClick={back} disabled={disabled || index === 0 && !onPrevious} aria-label={review ? 'Back to last question' : index === 0 ? 'Back to previous step' : 'Previous question'} variant="ghost" size="auto"><PortalIcon name="arrow-left" /> Back</Button>}
        <Button type="submit" form={formId} className="study-primary study-slides__next" disabled={disabled || blocked || review && (submitDisabled || !questions.length)} aria-busy={submitting} variant="default" size="auto">
          {submitting ? <><Skeleton className="edu-skeleton--button" />Submitting…</> : review ? submitLabel : <>{editing ? 'Back to review' : index === questions.length - 1 ? 'Review answers' : 'Next'}<PortalIcon name="arrow" /></>}
        </Button>
      </div>
      {status && <div className="study-slides__footer-note">{status}</div>}
      {!review && !status && <span className="study-slides__keyboard"><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>Enter</kbd></span>}
    </>}
  >
    <form id={formId} onSubmit={advance} noValidate onKeyDown={event => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing) {
        event.preventDefault();
        if (!review) advance(event);
      }
    }} aria-busy={submitting}>
      {review ? <>
        <h1 data-slide-heading tabIndex={-1}>Review your answers</h1>
        <p className="study-slides__description">Review your answers below. You can change anything before you submit.</p>
        <ol className="study-slides__review">{questions.map((item, position) => <li key={item.id}>
          <div><span className="study-slides__review-number" aria-hidden="true">{position + 1}</span><h2>{item.prompt}</h2><Button type="button" className="study-text-button" disabled={disabled || blocked} aria-label={`Edit answer ${position + 1}`} onClick={() => {
                setEditing(true);
                move(position);
              }} variant="link" size="auto">Edit</Button></div>
          <p>{answers[item.id]}</p>
        </li>)}</ol>
      </> : <>
        <h1 id={promptId} data-slide-heading tabIndex={-1}>{question.prompt}</h1>
        <div className="study-slides__answer">
          <Textarea ref={input} id={answerId} value={answers[question.id] || ''} onChange={event => {
            setValidation('');
            onChange(question.id, event.target.value);
          }} rows={4} maxLength={10000} required disabled={disabled || blocked} placeholder="Type your answer…" aria-labelledby={promptId} aria-invalid={Boolean(validation)} aria-describedby={validation ? `${answerId}-error` : undefined} />
          <div className="study-slides__answer-meta">{(answers[question.id] || '').length.toLocaleString()} / 10,000</div>
        </div>
        {validation && <p id={`${answerId}-error`} className="study-error" role="alert">{validation}</p>}
      </>}
      {notices}
      {error && <p className="study-error" role="alert">{error}</p>}
    </form>
  </StudySlide>;
}
