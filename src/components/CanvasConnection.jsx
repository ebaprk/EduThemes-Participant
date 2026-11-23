import React, { createContext, useContext, useEffect, useState } from 'react';
import { canvasFields, disconnectCanvas, initializeCanvas } from '../utils/canvas';
import LoadingSkeleton, { Skeleton } from './LoadingSkeleton';
import { Button } from "@eduthemes/ui/components/button";
import { Card } from "@eduthemes/ui/components/card";
const CanvasContext = createContext(null);
export const useCanvas = () => useContext(CanvasContext);
export function CanvasProvider({
  children
}) {
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    initializeCanvas().then(data => {
      if (active) setParticipant(data);
    }).catch(failure => {
      if (active) setError(failure.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);
  const disconnect = async () => {
    if (disconnecting) return;
    setError('');
    setDisconnecting(true);
    try {
      await disconnectCanvas();
      setParticipant(null);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setDisconnecting(false);
    }
  };
  return <CanvasContext.Provider value={{
    participant,
    loading,
    disconnecting,
    error,
    disconnect
  }}>{children}</CanvasContext.Provider>;
}
export default function CanvasConnection({
  requiredForStudy = false
}) {
  const {
    participant,
    loading,
    disconnecting,
    error,
    disconnect
  } = useCanvas();
  const disconnectButton = <Button type="button" className="canvas-disconnect" disabled={disconnecting} aria-busy={disconnecting} onClick={disconnect} variant="ghost" size="auto">{disconnecting ? <><Skeleton className="edu-skeleton--button" />Disconnecting…</> : 'Disconnect Canvas'}</Button>;
  if (loading) return <LoadingSkeleton variant="connection" label="Checking Canvas connection…" />;
  if (error) return <Card className="study-panel canvas-connection" as="section"><p role="alert" className="study-error">{error}</p><p>To reconnect, open EduThemes from your Canvas course. {requiredForStudy ? 'This study requires a Canvas connection.' : 'You can also disconnect for studies that allow anonymous participation.'}</p>{disconnectButton}</Card>;
  if (!participant) return <aside className="study-privacy">To include your Canvas details, open your <a href="https://ufl.instructure.com" target="_blank" rel="noopener noreferrer">UF Canvas course</a> and select EduThemes, then enter your study code here. Your instructor must first enable EduThemes in the course.</aside>;
  return <Card className="study-panel canvas-connection" aria-label="Canvas participant details" as="section">
    <h2>Connected through Canvas</h2>
    <p>{participant.name || 'Your Canvas identity is verified.'}{participant.academic_year ? ` · ${participant.academic_year}` : ''}</p>
    <p>For studies that collect Canvas details, this information is included after you confirm sharing it. Check the details below before sharing them.</p>
    <details><summary>Review all Canvas details</summary><dl>{canvasFields.map(([field, label]) => {
          const value = Array.isArray(participant[field]) ? participant[field].join('; ') : participant[field];
          return value ? <React.Fragment key={field}><dt>{label}</dt><dd>{value}</dd></React.Fragment> : null;
        })}</dl></details>
    {!participant.academic_year && <p>Academic year was not supplied by Canvas.</p>}
    {disconnectButton}
  </Card>;
}
