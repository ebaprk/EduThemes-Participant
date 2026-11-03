import React, { useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PortalIcon from './PortalIcon';
import { privateLinkDestination } from '../utils/participantNavigation';
import './Header.css';

function Brand() {
  return <Link className="portal-brand" to="/" aria-label="EduThemes home"><img src="/eduthemes-mark.svg" alt="" width="30" height="30" /><span>EduThemes<span className="portal-brand-period">.</span></span></Link>;
}

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dialog = useRef(null);
  const [privateLink, setPrivateLink] = useState(''), [error, setError] = useState('');
  const inHub = pathname === '/my-studies', inResults = pathname === '/results';
  const context = inHub ? { title:'My studies', detail:'Your saved progress and activities', href:'/', action:'Join a study' }
    : inResults ? { title:'Study results', detail:'Summaries released by your study team', href:'/my-studies', action:'My studies' }
    : { title:'Participant portal', detail:'Join a study or return to one you started', href:'/my-studies', action:'Saved studies' };
  useLayoutEffect(() => { window.scrollTo({ top:0, left:0, behavior:'instant' }); dialog.current?.close(); }, [pathname]);
  const openPrivateLink = () => { setError(''); setPrivateLink(''); dialog.current.showModal(); dialog.current.querySelector('input')?.focus(); };
  const submitLink = event => {
    event.preventDefault();
    const destination = privateLinkDestination(privateLink);
    if (!destination) { setError('Paste a complete private study or results link, or your 64-character study key.'); return; }
    dialog.current.close(); setPrivateLink(''); setError(''); navigate(destination);
  };
  const navigation = <><Link to="/" aria-current={!inHub && !inResults ? 'page' : undefined}><PortalIcon name="flask"/><span>Join a study</span></Link><Link to="/my-studies" aria-current={inHub ? 'page' : undefined}><PortalIcon name="folder"/><span>My studies</span></Link><Link to="/results" aria-current={inResults ? 'page' : undefined}><PortalIcon name="book"/><span>Study results</span></Link></>;
  return <>
    <aside className="participant-sidebar" aria-label="Participant workspace"><div className="portal-sidebar-brand"><Brand/></div><nav aria-label="Participant navigation"><span className="portal-sidebar-label">PARTICIPATION</span>{navigation}</nav></aside>
    <header className="participant-workspace-header" aria-label="Participant tools">
      <div className="portal-header-brand"><Brand/></div><div className="portal-toolbar-context"><strong>{context.title}</strong><span>{context.detail}</span></div>
      <div className="portal-toolbar-actions"><Link className="portal-toolbar-return" to={context.href}>{context.action}</Link><button type="button" className="portal-private-link-button" onClick={openPrivateLink}><PortalIcon name="key"/><span>Open private link</span></button></div>
      <nav className="portal-mobile-navigation" aria-label="Participant navigation">{navigation}</nav>
    </header>
    <dialog ref={dialog} className="portal-private-link-dialog" aria-labelledby="private-link-dialog-title" aria-describedby="private-link-dialog-description" onClose={() => { setPrivateLink(''); setError(''); }}>
      <div className="portal-dialog-heading"><div><span className="study-eyebrow">Continue where you left off</span><h2 id="private-link-dialog-title">Open your private link</h2></div><button type="button" className="portal-dialog-close" aria-label="Close private link dialog" onClick={() => dialog.current.close()}>×</button></div>
      <p id="private-link-dialog-description">Paste the private return link you saved after joining or submitting. We’ll open the matching study progress or results page.</p>
      <form onSubmit={submitLink}><div className="study-field"><label htmlFor="toolbar-private-link">Private study or results link</label><input id="toolbar-private-link" type="password" autoComplete="off" spellCheck={false} value={privateLink} onChange={event => { setPrivateLink(event.target.value); setError(''); }} aria-invalid={Boolean(error)} aria-describedby={error ? 'private-link-dialog-error' : 'private-link-dialog-help'} required/><p className="study-help" id="private-link-dialog-help">A researcher’s 12-character study code belongs on the Join a study page.</p></div>{error && <p className="study-error" id="private-link-dialog-error" role="alert">{error}</p>}<div className="study-actions"><button type="button" className="study-secondary" onClick={() => dialog.current.close()}>Cancel</button><button type="submit" className="study-primary">Open my study or results<PortalIcon name="arrow"/></button></div></form>
    </dialog>
  </>;
}
