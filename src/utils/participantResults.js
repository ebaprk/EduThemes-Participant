const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const resultsSessionKey = 'eduthemes.results.credentials.v1';
export const resultsSections = [['overview','What the study explored'],['findings','What we learned'],['limitations','What these findings cannot tell us'],['next_steps','What happens next'],['contact','Questions and study contact']];
export function resultsCredentials(value) {
  if (!value || typeof value !== 'object') return null;
  if (/^[a-f0-9]{64}$/.test(value.p_access_key || '') && !value.p_submission_id && !value.p_request_id) return { p_access_key: value.p_access_key };
  if (!value.p_access_key && uuid.test(value.p_submission_id || '') && uuid.test(value.p_request_id || '')) return { p_submission_id: value.p_submission_id, p_request_id: value.p_request_id };
  return null;
}
export function parseResultsLink(input) {
  try {
    const text = String(input || '').trim();
    const hash = text.startsWith('#') ? text.slice(1) : new URL(text).hash.slice(1);
    const params = new URLSearchParams(hash);
    if (['access','submission','receipt'].some(key => params.getAll(key).length > 1)) return null;
    return resultsCredentials({ p_access_key: params.get('access'), p_submission_id: params.get('submission'), p_request_id: params.get('receipt') });
  } catch { return null; }
}
export function privateResultsPath(input) {
  const value = resultsCredentials(input);
  if (!value) throw new Error('A valid private results link is required.');
  const hash = value.p_access_key ? `access=${value.p_access_key}` : `submission=${value.p_submission_id}&receipt=${value.p_request_id}`;
  return `/results#${hash}`;
}
export function participantResultsText(data) {
  if (!data.release) return '';
  const { release } = data;
  return [`${data.study_title} — participant results`, `Study version ${data.version_number} · Results release ${release.release_number}`,
    `Released ${release.released_at}`, release.content.title,
    ...resultsSections.flatMap(([key,label]) => release.content[key] ? [`${label}\n${release.content[key]}`] : [])].join('\n\n');
}
