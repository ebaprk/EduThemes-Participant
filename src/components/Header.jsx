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
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname]);
  const navigation = <><Link to="/" aria-current={!inHub ? 'page' : undefined}><PortalIcon name="flask" /><span>Join a study</span></Link><Link to="/my-studies" aria-current={inHub ? 'page' : undefined}><PortalIcon name="folder" /><span>My studies</span></Link></>;
  return <>
    <aside className="participant-sidebar" aria-label="Participant workspace"><div className="portal-sidebar-brand"><Brand /></div><div className="portal-workspace-label"><span><PortalIcon name="message" /></span><div><strong>Participant portal</strong><span>Your studies and activities</span></div></div><nav aria-label="Participant navigation"><span className="portal-sidebar-label">PARTICIPATION</span>{navigation}</nav><div className="portal-sidebar-bottom"><div className="portal-privacy-card"><PortalIcon name="shield" /><strong>Your choice. Your perspective.</strong><p>Review the study information and decide how you want to take part.</p></div><div className="portal-sidebar-footer"><span><PortalIcon name="book" /></span><div><strong>EduThemes</strong><span>Educational research</span></div></div></div></aside>
    <header className="participant-workspace-header"><div className="portal-header-brand"><Brand /></div><div className="portal-breadcrumb"><PortalIcon name="folder" /><span>Workspace</span><PortalIcon name="chevron" /><span>{inHub ? 'My studies' : 'Join a study'}</span></div><nav className="portal-mobile-navigation" aria-label="Participant navigation">{navigation}</nav><span className="portal-header-label"><span aria-hidden="true" />Participant portal</span></header>
  </>;
}
