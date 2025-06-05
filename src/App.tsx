import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import HomePage from './pages/HomePage';
import MyTripsPage from './pages/MyTripsPage';
import CreateTripPage from './pages/CreateTripPage';
import GamePage from './pages/GamePage';
import TipsPage from './pages/TipsPage';
import ChecklistPage from './pages/ChecklistPage';
import BucketListPage from './pages/BucketListPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/my-trips" element={<MyTripsPage />} />
        <Route path="/create-trip" element={<CreateTripPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/tips" element={<TipsPage />} />
        <Route path="/checklist" element={<ChecklistPage />} />
        <Route path="/bucket-list" element={<BucketListPage />} />
        {/* Redirect /trips to /my-trips for better UX */}
        <Route path="/trips" element={<Navigate to="/my-trips" replace />} />
      </Routes>
    </Router>
  );
}

export default App;