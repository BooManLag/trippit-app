import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';

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
import AcceptInvitePage from './pages/AcceptInvitePage';
import DiaryPage from './pages/DiaryPage';
import SharedItinerariesPage from './pages/SharedItinerariesPage';

// Components
import BoltBadge from './components/BoltBadge';

// Auth redirect component
const AuthRedirect: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // If user logs out and is on a protected page, redirect to home
      if (!user && !location.pathname.startsWith('/game') && location.pathname !== '/' && !location.pathname.startsWith('/accept-invite') && location.pathname !== '/shared-itineraries') {
        navigate('/');
      }
    };
    
    // Check auth on mount
    checkAuth();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // When user signs out, redirect to home page unless they're on a public page
        if (!location.pathname.startsWith('/game') && location.pathname !== '/' && !location.pathname.startsWith('/accept-invite') && location.pathname !== '/shared-itineraries') {
          navigate('/');
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);
  
  return <>{children}</>;
};

function App() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen text-white relative">
      {/* Subtle travel-themed background pattern */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 via-purple-900/5 to-indigo-900/5"></div>
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm0 0c0 11.046 8.954 20 20 20s20-8.954 20-20-8.954-20-20-20-20 8.954-20 20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}></div>
      </div>

      <AuthRedirect>
        {/* Only show BoltBadge on the home page */}
        {isHomePage && <BoltBadge />}
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
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/diary" element={<DiaryPage />} />
          <Route path="/shared-itineraries" element={<SharedItinerariesPage />} />
        </Routes>
      </AuthRedirect>
    </div>
  );
}

// Wrapper component to provide Router context
function AppWithRouter() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default AppWithRouter;