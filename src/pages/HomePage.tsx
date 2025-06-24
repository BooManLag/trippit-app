import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../components/AuthModal';
import { supabase } from '../lib/supabase';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
    <div className="min-h-screen overflow-hidden relative">
      {/* Background overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40 z-0"></div>
      
      {/* Animated floating elements */}
      <div className="fixed inset-0 pointer-events-none z-10">
        <div className="absolute top-10 left-10 w-2 h-2 bg-blue-500 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-yellow-400 rounded-full animate-ping opacity-40"></div>
        <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce opacity-50"></div>
        <div className="absolute top-1/2 right-10 w-1 h-1 bg-green-400 rounded-full animate-pulse opacity-30"></div>
        <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-pink-500 rounded-full animate-ping opacity-40"></div>
      </div>

      <main className="container mx-auto mobile-padding py-8 sm:py-12 lg:py-16 max-w-6xl text-center relative z-20">
        {/* Animated Logo/Title */}
        <div className={`transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="relative inline-block mb-6 sm:mb-8 lg:mb-10">
            {/* Glowing background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg blur-xl opacity-30 animate-pulse"></div>
            
            {/* Main title with bouncy animation */}
            <h1 className="relative pixel-text text-3xl sm:text-4xl lg:text-6xl xl:text-7xl leading-relaxed transform hover:scale-105 transition-transform duration-300 cursor-default text-white">
              <span className="inline-block animate-bounce" style={{ animationDelay: '0ms' }}>T</span>
              <span className="inline-block animate-bounce" style={{ animationDelay: '100ms' }}>r</span>
              <span className="inline-block animate-bounce" style={{ animationDelay: '200ms' }}>i</span>
              <span className="inline-block animate-bounce" style={{ animationDelay: '300ms' }}>p</span>
              <span className="inline-block animate-bounce" style={{ animationDelay: '400ms' }}>p</span>
              <span className="inline-block animate-bounce text-yellow-400" style={{ animationDelay: '500ms' }}>'</span>
              <span className="inline-block animate-bounce" style={{ animationDelay: '600ms' }}>i</span>
              <span className="inline-block animate-bounce" style={{ animationDelay: '700ms' }}>t</span>
            </h1>
            
            {/* Sparkle effects */}
            <div className="absolute -top-2 -right-8 text-yellow-400 animate-spin text-sm">✨</div>
            <div className="absolute -bottom-2 -left-2 text-blue-400 animate-pulse">🌟</div>
          </div>
        </div>

        {/* Animated subtitle */}
        <div className={`transform transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <h2 className="pixel-text text-sm sm:text-lg lg:text-xl mb-6 sm:mb-8 lg:mb-10 text-yellow-400 animate-pulse glow-text">
            Fun. Memorable. Helpful.
          </h2>
        </div>

        {/* Animated description */}
        <div className={`transform transition-all duration-1000 delay-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <p className="outfit-text text-sm sm:text-base lg:text-lg mb-8 sm:mb-12 lg:mb-16 max-w-2xl mx-auto text-white px-4 py-3 rounded-lg backdrop-blur-sm bg-black/30 leading-relaxed">
            Tripp'it helps first-time travelers prepare smarter and laugh through their mistakes.
          </p>
        </div>

        {/* Animated action buttons with MUCH MORE SPACING */}
        <div className={`space-y-6 sm:space-y-8 mb-16 sm:mb-20 lg:mb-24 max-w-md mx-auto transform transition-all duration-1000 delay-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <button
            onClick={() => navigate('/game')}
            className="pixel-button-primary w-full group relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center mobile-gap">
              <span>🎮</span>
              <span>SURVIVE A SCENARIO</span>
              <span className="group-hover:animate-bounce">🎯</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </button>

          <button
            onClick={handlePlanTrip}
            className="pixel-button-secondary w-full group relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center mobile-gap">
              <span>✈️</span>
              <span>PLAN MY TRIP</span>
              <span className="group-hover:animate-bounce">🗺️</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </button>
        </div>

        {/* Animated feature cards with PROPER SPACING */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-16 sm:mb-20 lg:mb-24 transform transition-all duration-1000 delay-900 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {[
            {
              icon: "🤪",
              title: "Where'd I Go?",
              description: "Survive hilarious travel disasters",
              delay: "0ms"
            },
            {
              icon: "📍",
              title: "City Mode",
              description: "Get city-specific survival tips",
              delay: "100ms"
            },
            {
              icon: "🎒",
              title: "Trip Planner",
              description: "Track trips and collect badges",
              delay: "200ms"
            },
            {
              icon: "💬",
              title: "Travel Stories",
              description: "Learn from epic fails and wins",
              delay: "300ms"
            }
          ].map((feature, index) => (
            <div 
              key={index} 
              className="pixel-card group hover:scale-105 transition-all duration-300 cursor-pointer hover:border-blue-500/40"
              style={{ animationDelay: feature.delay }}
            >
              <div className="text-xl sm:text-2xl mb-2 sm:mb-3 group-hover:animate-bounce transition-all duration-300">
                {feature.icon}
              </div>
              <h3 className="pixel-text text-xs sm:text-sm mb-2 text-white group-hover:text-blue-400 transition-colors">
                {feature.title}
              </h3>
              <p className="outfit-text text-gray-400 text-xs sm:text-sm group-hover:text-gray-300 transition-colors leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Animated how it works section with MORE SPACING */}
        <section className={`mb-16 sm:mb-20 lg:mb-24 transform transition-all duration-1000 delay-1100 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <h2 className="pixel-text text-base sm:text-xl lg:text-2xl mb-8 sm:mb-12 lg:mb-16 relative text-white">
            HOW IT WORKS
            <span className="absolute -top-2 -right-8 text-yellow-400 animate-spin text-sm">⚡</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 text-left">
            {[
              "Choose your destination and trip dates",
              "Discover tips and bucket list goals",
              "Survive your trip and earn badges",
              "Reflect, share, and prepare for the next one"
            ].map((step, index) => (
              <div 
                key={index} 
                className="flex items-start pixel-card group hover:scale-105 transition-all duration-300 hover:border-green-500/40"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="pixel-text text-yellow-400 mr-3 sm:mr-4 text-xs sm:text-sm group-hover:animate-pulse flex-shrink-0">
                  {index + 1}.
                </span>
                <p className="outfit-text text-gray-300 text-sm sm:text-base group-hover:text-white transition-colors leading-relaxed">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Floating call-to-action with PROPER SPACING */}
        <div className={`mb-16 sm:mb-20 lg:mb-24 transform transition-all duration-1000 delay-1300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="pixel-card bg-gradient-to-r from-purple-900/70 to-blue-900/70 border-2 border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 hover:scale-105 backdrop-blur-sm">
            <div className="text-2xl mb-4 animate-bounce">🚀</div>
            <h3 className="pixel-text text-base sm:text-lg lg:text-xl mb-6 sm:mb-8 text-purple-400 glow-text">READY FOR ADVENTURE?</h3>
            <p className="outfit-text text-gray-300 mb-6 sm:mb-8 text-sm sm:text-base lg:text-lg leading-relaxed">
              Join thousands of travelers who've survived their trips with style!
            </p>
            <button
              onClick={handlePlanTrip}
              className="pixel-button-primary bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transform hover:scale-105 transition-all duration-300 w-full sm:w-auto"
            >
              START YOUR JOURNEY 🌟
            </button>
          </div>
        </div>
      </main>

      {/* Animated footer */}
      <footer className={`border-t border-gray-800 py-6 sm:py-8 text-center mobile-padding transform transition-all duration-1000 delay-1500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'} relative z-20`}>
        <nav className="mb-4">
          {["About", "Contact", "Terms"].map((link, index) => (
            <a
              key={index}
              href={`/${link.toLowerCase()}`}
              className="pixel-text text-gray-400 hover:text-white mx-2 sm:mx-4 text-xs transition-all duration-300 hover:scale-110 inline-block"
            >
              {link}
            </a>
          ))}
        </nav>
        <p className="outfit-text text-gray-600 text-xs sm:text-sm">
          © Tripp'it 2025 – Travel with a twist.
          <span className="inline-block ml-2 animate-pulse">✨</span>
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