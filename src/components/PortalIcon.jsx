import React from 'react';

const paths = {
  flask: <><path d="M9 3h6M10 3v6l-5.5 9a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9V3" /><path d="M8 14h8M10 17h4" /></>,
  folder: <path d="M3 7V5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
  key: <><circle cx="8" cy="8" r="5" /><path d="m11.5 11.5 9 9M16 16l3-3M18.5 18.5l3-3" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" /><path d="m8 12 3 3 5-6" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  check: <path d="m5 12 4 4L19 6" />,
  message: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2v-9A9 9 0 0 1 11 4h2a8 8 0 0 1 8 7.5Z" />,
  book: <><path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z" /><path d="M12 5v15" /></>,
};
export default function PortalIcon({ name, className = '', ...props }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>{paths[name] || paths.flask}</svg>;
}
