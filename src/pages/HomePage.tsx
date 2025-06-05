import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AuthModal from '../components/AuthModal';
import { MapPin, Compass } from 'lucide-react';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    navigate('/my-trips');
  };

  const handleMyTrips = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setShowAuthModal(true);
    } else {
      navigate('/my-trips');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <h1 className="pixel-text text-4xl mb-8 leading-relaxed">
          MAKE EVERY<br />TRIP COUNT.
        </h1>

        <h2 className="pixel-text text-xl mb-8 text-yellow-400">
          Fun. Memorable. Helpful.
        </h2>

        <p className="outfit-text text-lg mb-12 max-w-lg mx-auto text-gray-300">
          Tripp'it helps first-time travelers prepare smarter and laugh through their mistakes.
        </p>

        <div className="space-y-4 mb-16">
          <button
            onClick={handleMyTrips}
            className="pixel-button-primary w-full max-w-md flex items-center justify-center gap-2"
          >
            <Compass className="w-5 h-5" />
            MY TRIPS
          </button>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {[
            {
              icon: "🎮",
              title: "Where'd I Go?",
              description: "Play the travel-fail simulator"
            },
            {
              icon: "📍",
              title: "City Mode",
              description: "Get city-specific survival tips"
            },
            {
              icon: "🎒",
              title: "Trip Planner",
              description: "Track trips and collect badges"
            },
            {
              icon: "💬",
              title: "Travel Stories",
              description: "Learn from real stories"
            }
          ].map((feature, index) => (
            <div key={index} className="pixel-card">
              <div className="text-2xl mb-3">{feature.icon}</div>
              <h3 className="pixel-text text-sm mb-2 text-white">{feature.title}</h3>
              <p className="outfit-text text-gray-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center">
        <p className="outfit-text text-gray-600 text-sm">
          © Tripp'it 2025 – Travel with a twist.
        </p>
      </footer>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default HomePage;