import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

export default function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-brand" to="/">
          <img className="site-brand__mark" src="/eduthemes-mark.svg" alt="" width="34" height="34" aria-hidden="true" />
          <span className="site-brand__name">EduThemes</span>
        </Link>
      </div>
    </header>
  );
}
