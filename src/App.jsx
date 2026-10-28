import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Participant from './components/Participant';
import StudyHub from './components/StudyHub';
import { CanvasProvider } from './components/CanvasConnection';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <CanvasProvider><div className="App">
        <Header />
        <Routes>
          <Route path="/my-studies" element={<StudyHub />} />
          <Route path="/" element={<Participant />} />
          <Route path="/join" element={<Participant />} />
          <Route path="/join/:code" element={<Participant />} />
          <Route path="/canvas" element={<Participant />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div></CanvasProvider>
    </BrowserRouter>
  );
}
