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
import BadgesPage from './pages/BadgesPage';

// Components
import BoltBadge from './components/BoltBadge';
import Sparkles from './components/Sparkles';

// Auth redirect component
const AuthRedirect: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // If user logs out and is on a protected page, redirect to home
      if (!user && !location.pathname.startsWith('/game') && location.pathname !== '/' && !location.pathname.startsWith('/accept-invite')) {
        navigate('/');
      }
    };
    
    // Check auth on mount
    checkAuth();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // When user signs out, redirect to home page unless they're on a public page
        if (!location.pathname.startsWith('/game') && location.pathname !== '/' && !location.pathname.startsWith('/accept-invite')) {
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
    <div className="min-h-screen text-white">
      <AuthRedirect>
        {/* Only show BoltBadge on the home page */}
        {isHomePage && <BoltBadge />}
        <Sparkles />
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
          <Route path="/badges" element={<BadgesPage />} />
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