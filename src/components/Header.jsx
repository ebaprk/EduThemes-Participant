import React, { useLayoutEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const { pathname } = useLocation();
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname]);
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-brand" to="/">
          <img className="site-brand__mark" src="/eduthemes-mark.svg" alt="" width="34" height="34" aria-hidden="true" />
          <span className="site-brand__name">EduThemes</span>
        </Link>
        <div className="site-header__context"><span>Participant portal</span><small>Your place in the research</small></div>
        <nav aria-label="Participant navigation"><Link to="/" aria-current={pathname !== "/my-studies" ? "page" : undefined}>Join a study</Link><Link to="/my-studies" aria-current={pathname === "/my-studies" ? "page" : undefined}>My studies</Link></nav>
      </div>
    </header>
  );
}
