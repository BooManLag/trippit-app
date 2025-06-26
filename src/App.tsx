import React, { useEffect, useState } from 'react';
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
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import TermsPage from './pages/TermsPage';

// Components
import BoltBadge from './components/BoltBadge';
import LoadingBar from './components/LoadingBar';

// Auth redirect component
const AuthRedirect: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // If user logs out and is on a protected page, redirect to home
      if (!user && !location.pathname.startsWith('/game') && 
          location.pathname !== '/' && 
          !location.pathname.startsWith('/accept-invite') && 
          location.pathname !== '/shared-itineraries' &&
          location.pathname !== '/about' &&
          location.pathname !== '/contact' &&
          location.pathname !== '/terms') {
        navigate('/');
      }
      setLoading(false);
    };
    
    // Check auth on mount
    checkAuth();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // When user signs out, redirect to home page unless they're on a public page
        if (!location.pathname.startsWith('/game') && 
            location.pathname !== '/' && 
            !location.pathname.startsWith('/accept-invite') && 
            location.pathname !== '/shared-itineraries' &&
            location.pathname !== '/about' &&
            location.pathname !== '/contact' &&
            location.pathname !== '/terms') {
          navigate('/');
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="pixel-text text-blue-400">LOADING...</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

// Page transition wrapper
const PageTransition: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [prevLocation, setPrevLocation] = useState('');
  
  useEffect(() => {
    // Only show loading when actually changing pages, not on initial load
    if (prevLocation && prevLocation !== location.pathname) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800); // Match this with the LoadingBar duration
      
      return () => clearTimeout(timer);
    }
    
    setPrevLocation(location.pathname);
  }, [location.pathname, prevLocation]);
  
  return (
    <>
      <LoadingBar isLoading={isLoading} />
      {children}
    </>
  );
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
        <PageTransition>
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
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Routes>
        </PageTransition>
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