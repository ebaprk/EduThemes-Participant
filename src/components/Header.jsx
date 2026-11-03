import React, { useLayoutEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PortalIcon from './PortalIcon';
import './Header.css';

function Brand() {
  return <Link className="portal-brand" to="/" aria-label="EduThemes home"><img src="/eduthemes-mark.svg" alt="" width="30" height="30" /><span>EduThemes<span className="portal-brand-period">.</span></span></Link>;
}

export default function Header() {
  const { pathname } = useLocation();
  const inHub = pathname === '/my-studies';
  const inResults = pathname === '/results';
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname]);
  const navigation = <><Link to="/" aria-current={!inHub && !inResults ? 'page' : undefined}><PortalIcon name="flask" /><span>Join a study</span></Link><Link to="/my-studies" aria-current={inHub ? 'page' : undefined}><PortalIcon name="folder" /><span>My studies</span></Link><Link to="/results" aria-current={inResults ? 'page' : undefined}><PortalIcon name="book" /><span>Study results</span></Link></>;
  return <>
    <aside className="participant-sidebar" aria-label="Participant workspace">
      <div className="portal-sidebar-brand"><Brand /></div>
      <nav aria-label="Participant navigation"><span className="portal-sidebar-label">PARTICIPATION</span>{navigation}</nav>
    </aside>
    <header className="participant-workspace-header"><div className="portal-header-brand"><Brand /></div><div className="portal-breadcrumb"><PortalIcon name="folder" /><span>Workspace</span><PortalIcon name="chevron" /><span>{inResults ? 'Study results' : inHub ? 'My studies' : 'Join a study'}</span></div><nav className="portal-mobile-navigation" aria-label="Participant navigation">{navigation}</nav><span className="portal-header-label"><span aria-hidden="true" />Participant portal</span></header>
  </>;
}
