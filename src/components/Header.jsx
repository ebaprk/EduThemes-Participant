import { FeatureHelp } from '@eduthemes/ui/components/feature-help';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { Button } from '@eduthemes/ui/components/button';
import { Input } from '@eduthemes/ui/components/input';
import { Label } from '@eduthemes/ui/components/label';
import { ManagedDialog } from '@eduthemes/ui/workbench';
import PortalIcon from './PortalIcon';
import { privateLinkDestination } from '../utils/participantNavigation';
import './Header.css';

const pages = [
  { path: '/', label: 'Join a study', icon: 'flask' },
  { path: '/my-studies', label: 'My studies', icon: 'folder' },
  { path: '/results', label: 'Study results', icon: 'book' },
];

function Brand({ link }) {
  const mark = <><img src="/eduthemes-mark.svg" alt="" width="30" height="30" /><span>EduThemes</span></>;
  return link ? <Link className="portal-brand" to="/" aria-label="EduThemes home">{mark}</Link> : <span className="portal-brand">{mark}</span>;
}

export default function Header() {
  const { pathname } = useLocation();
  const inJoin = Boolean(useMatch('/join/:code'));
  const activePage = pages.find(page => page.path === pathname) ?? pages[0];
  const navigate = useNavigate();
  const dialog = useRef(null);
  const [privateLink, setPrivateLink] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = `${activePage.label} | EduThemes`;
  }, [activePage]);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    dialog.current?.close();
  }, [pathname]);

  const submitLink = event => {
    event.preventDefault();
    const destination = privateLinkDestination(privateLink);
    if (!destination) {
      setError('Paste a complete private link or enter your 64-character study key.');
      return;
    }
    dialog.current.close();
    navigate(destination);
  };

  return <>
    <header className="participant-header">
      <div className="portal-header-inner">
        <Brand link={!inJoin} />
        <nav className="portal-navigation" aria-label="Participant navigation">
          {pages.map(page => (
            <Link key={page.path} to={page.path} aria-current={activePage === page ? 'page' : undefined}>
              <PortalIcon name={page.icon} />
              {page.label}
            </Link>
          ))}
        </nav>
        <div className="portal-toolbar-actions">
          <div id="study-information-toolbar" className="portal-study-information-slot" />
          {!inJoin && <FeatureHelp audience="participant" label="Help" />}
          {inJoin ? (
            <Button asChild variant="ghost" size="auto">
              <Link to="/"><PortalIcon name="exit" />Leave study</Link>
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="auto" onClick={() => {
              dialog.current.showModal();
              dialog.current.querySelector('input')?.focus();
            }}>
              <PortalIcon name="key" />Open private link
            </Button>
          )}
        </div>
      </div>
    </header>
    <ManagedDialog ref={dialog} className="portal-private-link-dialog" aria-labelledby="private-link-dialog-title" onClose={() => {
      setPrivateLink('');
      setError('');
    }}>
      <div className="portal-dialog-heading">
        <h2 id="private-link-dialog-title">Open private link</h2>
        <Button type="button" className="portal-dialog-close" aria-label="Close private link dialog"
          onClick={() => dialog.current.close()} variant="ghost" size="icon">
          <PortalIcon name="close" />
        </Button>
      </div>
      <form onSubmit={submitLink}>
        <FeatureHelp audience="participant" guide="return-to-study#open" label="Help with private links" />
        <div className="study-field">
          <Label htmlFor="toolbar-private-link">Study or results link</Label>
          <Input id="toolbar-private-link" type="password" autoComplete="off" spellCheck={false}
            value={privateLink} onChange={event => {
              setPrivateLink(event.target.value);
              setError('');
            }}
            aria-invalid={Boolean(error)} aria-describedby={error ? 'private-link-dialog-error' : 'private-link-dialog-help'} required />
          {error ? <p className="study-error" id="private-link-dialog-error" role="alert">{error}</p> :
            <p className="study-help" id="private-link-dialog-help">You can also enter a 64-character study key.</p>}
        </div>
        <div className="study-actions">
          <Button type="button" onClick={() => dialog.current.close()} variant="outline">Cancel</Button>
          <Button type="submit">Open link<PortalIcon name="arrow" /></Button>
        </div>
      </form>
    </ManagedDialog>
  </>;
}
