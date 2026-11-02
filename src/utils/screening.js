export function visibleScreeningQuestions(questions, answers) {
  const visible=[]; const resolved={};
  for(const question of questions || []) {
    if(!question.show_if || resolved[question.show_if.question_id] === question.show_if.option_id) {
      visible.push(question);
      if(question.options.some(option=>option.id === answers[question.id])) resolved[question.id]=answers[question.id];
    }
  }
  return visible;
}
export function visibleScreeningAnswers(questions, answers) {
  return Object.fromEntries(visibleScreeningQuestions(questions,answers).filter(question=>question.options.some(option=>option.id===answers[question.id])).map(question=>[question.id,answers[question.id]]));
}
export const screeningStatusLabels = { awaiting_review:'Awaiting researcher review',eligible:'Eligibility confirmed',waitlisted:'On the waitlist',not_eligible:'Not eligible for this study',invited:'Invited to take part' };
export const screeningNextSteps = {
  awaiting_review:'The study team will review your screening answers. Return to this private link to check their decision.',
  eligible:'The study team has confirmed your eligibility. Wait for an invitation here before joining the study.',
  waitlisted:'You are on the study’s waitlist. Check this private link for updates from the study team.',
  not_eligible:'The study team has reviewed your screening answers and marked you as not eligible for this study. You can contact them if you have questions.',
  invited:'You can review the study consent and choose whether to join. Screening permission does not commit you to taking part.',
};
