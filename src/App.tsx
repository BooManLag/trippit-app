import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Pages
import HomePage from './pages/HomePage';
import CreateTripPage from './pages/CreateTripPage';
import TripCreatedPage from './pages/TripCreatedPage';
import MyTripsPage from './pages/MyTripsPage';
import TripDashboardPage from './pages/TripDashboardPage';
import GamePage from './pages/GamePage';
import TipsPage from './pages/TipsPage';
import ChecklistPage from './pages/ChecklistPage';
import BucketListPage from './pages/BucketListPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create-trip" element={<CreateTripPage />} />
        <Route path="/trip-created" element={<TripCreatedPage />} />
        <Route path="/my-trips" element={<MyTripsPage />} />
        <Route path="/trip/:tripId" element={<TripDashboardPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/tips" element={<TipsPage />} />
        <Route path="/checklist" element={<ChecklistPage />} />
        <Route path="/bucket-list" element={<BucketListPage />} />
      </Routes>
    </Router>
  );
}

export default App;