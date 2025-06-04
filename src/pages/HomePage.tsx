import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
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

        {/* CTA Buttons */}
        <div className="space-y-6 mb-16">
          <button
            onClick={() => navigate('/game')}
            className="pixel-button-primary w-full max-w-md"
          >
            🧭 TRY A SCENARIO
          </button>

          <button
            onClick={() => navigate('/create-trip')}
            className="pixel-button-secondary w-full max-w-md"
          >
            ✈️ PLAN MY TRIP
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

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="pixel-text text-2xl mb-8">HOW IT WORKS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {[
              "Choose your destination and trip dates",
              "Discover tips and bucket list goals",
              "Survive your trip and earn badges",
              "Reflect, share, and prepare for the next one"
            ].map((step, index) => (
              <div key={index} className="flex items-start pixel-card">
                <span className="pixel-text text-yellow-400 mr-4">{index + 1}.</span>
                <p className="outfit-text text-gray-300">{step}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 text-center">
        <nav className="mb-4">
          {["About", "Contact", "Terms"].map((link, index) => (
            <a
              key={index}
              href={/${link.toLowerCase()}}
              className="pixel-text text-gray-400 hover:text-white mx-4 text-xs"
            >
              {link}
            </a>
          ))}
        </nav>
        <p className="outfit-text text-gray-600 text-sm">
          © Tripp'it 2025 – Travel with a twist.
        </p>
      </footer>
    </div>
  );
};

export default HomePage;