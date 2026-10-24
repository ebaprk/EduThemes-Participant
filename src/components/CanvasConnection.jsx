import React, { createContext, useContext, useEffect, useState } from 'react';
import { canvasFields, disconnectCanvas, initializeCanvas } from '../utils/canvas';

const CanvasContext = createContext(null);
export const useCanvas = () => useContext(CanvasContext);

export function CanvasProvider({ children }) {
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    initializeCanvas().then((data) => { if (active) setParticipant(data); })
      .catch((failure) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const disconnect = async () => {
    setError('');
    try { await disconnectCanvas(); setParticipant(null); }
    catch (failure) { setError(failure.message); }
  };
  return <CanvasContext.Provider value={{ participant, loading, error, disconnect }}>{children}</CanvasContext.Provider>;
}

export default function CanvasConnection() {
  const { participant, loading, error, disconnect } = useCanvas();
  if (loading) return <p role="status">Checking Canvas connection…</p>;
  if (error) return <section className="study-panel canvas-connection"><p role="alert" className="study-error">{error}</p><p>To reconnect, open EduThemes from your Canvas course. You can also disconnect to participate without Canvas details.</p><button type="button" className="canvas-disconnect" onClick={disconnect}>Disconnect Canvas</button></section>;
  if (!participant) return <aside className="study-privacy">To include your Canvas details, open your <a href="https://ufl.instructure.com" target="_blank" rel="noopener noreferrer">UF Canvas course</a> and select EduThemes, then enter your study code here. Your instructor must first enable EduThemes in the course.</aside>;
  return <section className="study-panel canvas-connection" aria-label="Canvas participant details">
    <h2>Connected through Canvas</h2>
    <p>{participant.name || 'Your Canvas identity is verified.'}{participant.academic_year ? ` · ${participant.academic_year}` : ''}</p>
    <p>These details will be included with each study you submit while connected. Check the details below before sharing them.</p>
    <details><summary>Review all Canvas details</summary><dl>{canvasFields.map(([field, label]) => {
      const value = Array.isArray(participant[field]) ? participant[field].join('; ') : participant[field];
      return value ? <React.Fragment key={field}><dt>{label}</dt><dd>{value}</dd></React.Fragment> : null;
    })}</dl></details>
    {!participant.academic_year && <p>Academic year was not supplied by Canvas.</p>}
    <button type="button" className="canvas-disconnect" onClick={disconnect}>Disconnect Canvas</button>
  </section>;
}
