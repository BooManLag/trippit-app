import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../components/AuthModal';
import { supabase } from '../lib/supabase';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    navigate('/my-trips');
  };

  const handlePlanTrip = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setShowAuthModal(true);
    } else {
      navigate('/my-trips');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="container mx-auto mobile-padding py-8 sm:py-12 max-w-4xl text-center">
        <h1 className="pixel-text text-2xl sm:text-3xl lg:text-4xl mb-6 sm:mb-8 leading-relaxed">
          MAKE EVERY<br />TRIP COUNT.
        </h1>

        <h2 className="pixel-text text-lg sm:text-xl mb-6 sm:mb-8 text-yellow-400">
          Fun. Memorable. Helpful.
        </h2>

        <p className="outfit-text text-base sm:text-lg mb-8 sm:mb-12 max-w-lg mx-auto text-gray-300 px-4">
          Tripp'it helps first-time travelers prepare smarter and laugh through their mistakes.
        </p>

        <div className="space-y-4 sm:space-y-6 mb-12 sm:mb-16 max-w-md mx-auto">
          <button
            onClick={() => navigate('/game')}
            className="pixel-button-primary w-full"
          >
            🎮 SURVIVE A SCENARIO
          </button>

          <button
            onClick={handlePlanTrip}
            className="pixel-button-secondary w-full"
          >
            ✈️ PLAN MY TRIP
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {[
            {
              icon: "🤪",
              title: "Where'd I Go?",
              description: "Survive hilarious travel disasters"
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
              description: "Learn from epic fails and wins"
            }
          ].map((feature, index) => (
            <div key={index} className="pixel-card">
              <div className="text-xl sm:text-2xl mb-2 sm:mb-3">{feature.icon}</div>
              <h3 className="pixel-text text-xs sm:text-sm mb-2 text-white">{feature.title}</h3>
              <p className="outfit-text text-gray-400 text-xs sm:text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        <section className="mb-12 sm:mb-16">
          <h2 className="pixel-text text-lg sm:text-2xl mb-6 sm:mb-8">HOW IT WORKS</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-left">
            {[
              "Choose your destination and trip dates",
              "Discover tips and bucket list goals",
              "Survive your trip and earn badges",
              "Reflect, share, and prepare for the next one"
            ].map((step, index) => (
              <div key={index} className="flex items-start pixel-card">
                <span className="pixel-text text-yellow-400 mr-3 sm:mr-4 text-xs sm:text-sm">{index + 1}.</span>
                <p className="outfit-text text-gray-300 text-sm sm:text-base">{step}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-800 py-6 sm:py-8 text-center mobile-padding">
        <nav className="mb-4">
          {["About", "Contact", "Terms"].map((link, index) => (
            <a
              key={index}
              href={`/${link.toLowerCase()}`}
              className="pixel-text text-gray-400 hover:text-white mx-2 sm:mx-4 text-xs"
            >
              {link}
            </a>
          ))}
        </nav>
        <p className="outfit-text text-gray-600 text-xs sm:text-sm">
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
};

export default HomePage;