import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Stream from './pages/Stream';
import Navbar from './componants/Navbar';

function App() {
  return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/Stream/:portal" element={<Stream />} />
        </Routes>
    </BrowserRouter>
  );
}

export default App;