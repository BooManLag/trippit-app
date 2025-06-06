import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Trophy, Star, RotateCcw, Zap, Heart, Laugh, Gamepad2, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AuthModal from '../components/AuthModal';
import scenariosData from '../data/scenarios.json';

interface GameScenario {
  id: string;
  title: string;
  description: string;
  choices: GameChoice[];
  country: string;
  category: string;
  funLevel: 'mild' | 'spicy' | 'chaotic';
  emoji: string;
}

interface GameChoice {
  id: string;
  text: string;
  outcome: string;
  isCorrect: boolean;
  explanation?: string;
  funnyReaction?: string;
}

const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');
  
  const [trip, setTrip] = useState<any>(null);
  const [scenarios, setScenarios] = useState<GameScenario[]>([]);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<GameChoice | null>(null);
  const [showOutcome, setShowOutcome] = useState(false);
  const [score, setScore] = useState(0);
  const [completedScenarios, setCompletedScenarios] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasShownSignUpPrompt, setHasShownSignUpPrompt] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const fetchTripAndGenerateScenarios = async () => {
      try {
        setLoading(true);
        
        if (!tripId) {
          // No trip ID - generate random scenarios from JSON
          const randomScenarios = generateRandomScenarios();
          setScenarios(randomScenarios);
          setLoading(false);
          return;
        }

        // Fetch trip details
        const { data: tripData } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single();

        if (tripData) {
          setTrip(tripData);
          const [city, country] = tripData.destination.split(', ');
          
          // Generate trip-specific scenarios
          const tripScenarios = generateTripSpecificScenarios(city, country);
          setScenarios(tripScenarios);
        } else {
          // Fallback to random scenarios
          const randomScenarios = generateRandomScenarios();
          setScenarios(randomScenarios);
        }
      } catch (error) {
        console.error('Error fetching trip:', error);
        // Fallback to random scenarios
        const randomScenarios = generateRandomScenarios();
        setScenarios(randomScenarios);
      } finally {
        setLoading(false);
      }
    };

    fetchTripAndGenerateScenarios();
  }, [tripId]);

  const generateRandomScenarios = (): GameScenario[] => {
    // Get all generic scenarios (country: "any") and some random specific ones
    const genericScenarios = scenariosData.filter(s => s.country === 'any');
    const specificScenarios = scenariosData.filter(s => s.country !== 'any');
    
    // Shuffle and pick scenarios
    const shuffledGeneric = [...genericScenarios].sort(() => Math.random() - 0.5);
    const shuffledSpecific = [...specificScenarios].sort(() => Math.random() - 0.5);
    
    // Mix them: 60% generic, 40% specific for variety
    const selectedScenarios = [
      ...shuffledGeneric.slice(0, 5),
      ...shuffledSpecific.slice(0, 3)
    ].sort(() => Math.random() - 0.5);

    return selectedScenarios.slice(0, 8).map(scenario => ({
      ...scenario,
      title: scenario.title.replace(/\{\{city\}\}/g, 'Unknown City'),
      description: scenario.description.replace(/\{\{city\}\}/g, 'Unknown City')
    }));
  };

  const generateTripSpecificScenarios = (city: string, country: string): GameScenario[] => {
    // Always include generic scenarios
    const genericScenarios = scenariosData.filter(s => s.country === 'any');
    
    // Find country-specific scenarios
    const countrySpecificScenarios = scenariosData.filter(s => 
      s.country.toLowerCase() === country.toLowerCase() ||
      isCountryMatch(s.country, country)
    );
    
    // Find region-specific scenarios
    const regionSpecificScenarios = scenariosData.filter(s => 
      isRegionMatch(s.country, country)
    );

    // Combine and shuffle
    const allRelevantScenarios = [
      ...genericScenarios,
      ...countrySpecificScenarios,
      ...regionSpecificScenarios
    ];

    // Shuffle and select 8 scenarios
    const shuffledScenarios = [...allRelevantScenarios].sort(() => Math.random() - 0.5);
    const selectedScenarios = shuffledScenarios.slice(0, 8);

    // Replace placeholders with actual city name
    return selectedScenarios.map(scenario => ({
      ...scenario,
      title: scenario.title.replace(/\{\{city\}\}/g, city),
      description: scenario.description.replace(/\{\{city\}\}/g, city),
      choices: scenario.choices.map(choice => ({
        ...choice,
        outcome: choice.outcome.replace(/\{\{city\}\}/g, city),
        funnyReaction: choice.funnyReaction?.replace(/\{\{city\}\}/g, city)
      }))
    }));
  };

  const isCountryMatch = (scenarioCountry: string, tripCountry: string): boolean => {
    const countryMappings: { [key: string]: string[] } = {
      'France': ['France', 'French'],
      'Germany': ['Germany', 'German'],
      'Italy': ['Italy', 'Italian'],
      'Spain': ['Spain', 'Spanish'],
      'Japan': ['Japan', 'Japanese'],
      'Thailand': ['Thailand', 'Thai'],
      'Mexico': ['Mexico', 'Mexican'],
      'Kenya': ['Kenya', 'Kenyan'],
      'United Kingdom': ['UK', 'Britain', 'England', 'Scotland', 'Wales'],
      'United States': ['USA', 'US', 'America', 'American']
    };

    const scenarioCountryLower = scenarioCountry.toLowerCase();
    const tripCountryLower = tripCountry.toLowerCase();

    // Direct match
    if (scenarioCountryLower === tripCountryLower) return true;

    // Check mappings
    for (const [key, variants] of Object.entries(countryMappings)) {
      if (variants.some(v => v.toLowerCase() === tripCountryLower) && 
          key.toLowerCase() === scenarioCountryLower) {
        return true;
      }
    }

    return false;
  };

  const isRegionMatch = (scenarioCountry: string, tripCountry: string): boolean => {
    const regionMappings: { [key: string]: string[] } = {
      'France': ['Germany', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland'],
      'Germany': ['France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland'],
      'Italy': ['France', 'Germany', 'Spain', 'Netherlands', 'Belgium', 'Switzerland'],
      'Japan': ['China', 'South Korea', 'Taiwan', 'Singapore'],
      'Thailand': ['Vietnam', 'Cambodia', 'Laos', 'Myanmar', 'Malaysia'],
      'Mexico': ['Guatemala', 'Belize', 'Costa Rica', 'Panama', 'Colombia']
    };

    const scenarioCountryLower = scenarioCountry.toLowerCase();
    const tripCountryLower = tripCountry.toLowerCase();

    return regionMappings[scenarioCountry]?.some(c => 
      c.toLowerCase() === tripCountryLower
    ) || false;
  };

  const handleChoiceSelect = (choice: GameChoice) => {
    setSelectedChoice(choice);
    setShowOutcome(true);
    
    if (choice.isCorrect) {
      setScore(score + 1);
    }
    
    setCompletedScenarios(completedScenarios + 1);

    // Show sign-up prompt after first scenario if not authenticated
    if (completedScenarios === 0 && !isAuthenticated && !hasShownSignUpPrompt) {
      setTimeout(() => {
        setHasShownSignUpPrompt(true);
        setShowAuthModal(true);
      }, 3000); // Show after 3 seconds of viewing the outcome
    }
  };

  const handleContinue = () => {
    if (currentScenarioIndex < scenarios.length - 1) {
      setCurrentScenarioIndex(currentScenarioIndex + 1);
      setSelectedChoice(null);
      setShowOutcome(false);
    } else {
      setShowOutcome(false);
      setSelectedChoice(null);
    }
  };

  const handleRestart = () => {
    // Generate new random scenarios for replay value
    if (tripId && trip) {
      const [city, country] = trip.destination.split(', ');
      const newScenarios = generateTripSpecificScenarios(city, country);
      setScenarios(newScenarios);
    } else {
      const newScenarios = generateRandomScenarios();
      setScenarios(newScenarios);
    }
    
    setCurrentScenarioIndex(0);
    setSelectedChoice(null);
    setShowOutcome(false);
    setScore(0);
    setCompletedScenarios(0);
    setHasShownSignUpPrompt(false);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setIsAuthenticated(true);
  };

  const getFunLevelEmoji = (funLevel: string) => {
    switch (funLevel) {
      case 'mild': return '😊';
      case 'spicy': return '🌶️';
      case 'chaotic': return '🤪';
      default: return '😄';
    }
  };

  const getFunLevelColor = (funLevel: string) => {
    switch (funLevel) {
      case 'mild': return 'text-green-400';
      case 'spicy': return 'text-orange-400';
      case 'chaotic': return 'text-red-400';
      default: return 'text-blue-400';
    }
  };

  const isGameCompleted = completedScenarios >= scenarios.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white mobile-padding py-6 sm:py-8 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-2 h-2 bg-red-500 rounded-full animate-pulse opacity-60"></div>
          <div className="absolute top-32 right-20 w-1 h-1 bg-yellow-400 rounded-full animate-ping opacity-40"></div>
          <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce opacity-50"></div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="animate-bounce-in">
              <Loader2 className="w-8 sm:w-12 h-8 sm:h-12 text-red-500 animate-spin mr-3" />
              <span className="pixel-text text-red-400 text-sm sm:text-base">GENERATING CHAOS...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white mobile-padding py-6 sm:py-8 lg:py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-2 h-2 bg-red-500 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-yellow-400 rounded-full animate-ping opacity-40"></div>
        <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce opacity-50"></div>
        <div className="absolute top-1/2 right-10 w-1 h-1 bg-green-400 rounded-full animate-pulse opacity-30"></div>
        <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-pink-500 rounded-full animate-ping opacity-40"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className={`flex items-center gap-4 mb-6 sm:mb-8 lg:mb-12 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <button 
            onClick={() => tripId ? navigate(`/trip/${tripId}`) : navigate('/')} 
            className="text-blue-400 hover:text-blue-300 transition-colors hover:scale-110"
          >
            <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Gamepad2 className="w-6 sm:w-8 h-6 sm:h-8 text-red-500 animate-pulse" />
              <h2 className="pixel-text mobile-heading text-red-400 glow-text">WHERE'D I GO? 🎮</h2>
              <Target className="w-6 sm:w-8 h-6 sm:h-8 text-yellow-400 animate-float" />
            </div>
            {trip && (
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base break-words">
                Survive the chaos in {trip.destination}!
              </p>
            )}
            {!trip && (
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base">
                Random travel disasters await your survival skills!
              </p>
            )}
          </div>
        </div>

        {/* Game Stats */}
        <div className={`pixel-card bg-gradient-to-br from-red-900/20 to-orange-900/20 mb-6 sm:mb-8 border-2 border-red-500/30 animate-slide-in-up delay-200`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 sm:w-6 h-5 sm:h-6 text-yellow-400 animate-pulse" />
                <div>
                  <div className="pixel-text text-yellow-400 text-lg sm:text-xl">
                    {score}/{scenarios.length}
                  </div>
                  <div className="pixel-text text-xs text-gray-400">SURVIVAL SCORE</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 sm:w-6 h-5 sm:h-6 text-blue-400 animate-float" />
                <div>
                  <div className="pixel-text text-blue-400 text-lg sm:text-xl">
                    {Math.min(currentScenarioIndex + 1, scenarios.length)}/{scenarios.length}
                  </div>
                  <div className="pixel-text text-xs text-gray-400">CHAOS LEVEL</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 sm:w-6 h-5 sm:h-6 text-purple-400 animate-pulse" />
                <div>
                  <div className="pixel-text text-purple-400 text-lg sm:text-xl">
                    {completedScenarios > 0 ? '🔥' : '😴'}
                  </div>
                  <div className="pixel-text text-xs text-gray-400">FUN METER</div>
                </div>
              </div>
            </div>
            <button
              onClick={handleRestart}
              className="pixel-button-secondary flex items-center justify-center gap-2 w-full sm:w-auto hover-wiggle"
            >
              <RotateCcw className="w-4 h-4" />
              NEW CHAOS
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 h-4 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 h-full transition-all duration-500 flex items-center justify-center"
              style={{ width: `${(completedScenarios / scenarios.length) * 100}%` }}
            >
              {completedScenarios > 0 && (
                <span className="pixel-text text-xs text-black font-bold">
                  {Math.round((completedScenarios / scenarios.length) * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Game Content */}
        {isGameCompleted ? (
          <div className={`pixel-card bg-gradient-to-br from-green-900/20 to-blue-900/20 border-2 border-green-500/30 text-center animate-bounce-in delay-300`}>
            <div className="text-4xl sm:text-6xl mb-6 animate-float">🎉</div>
            <h3 className="pixel-text text-lg sm:text-2xl text-green-400 mb-4 glow-text">CHAOS SURVIVED!</h3>
            <p className="outfit-text text-gray-300 mb-6 sm:mb-8 text-sm sm:text-base">
              You survived {score} out of {scenarios.length} travel disasters like a pro!
            </p>
            
            <div className="mb-6 sm:mb-8">
              {score === scenarios.length && (
                <div className="pixel-card bg-yellow-500/10 border-yellow-500/20 mb-4 animate-pulse-glow">
                  <p className="pixel-text text-yellow-400 text-sm sm:text-base">🏆 PERFECT CHAOS MASTER! You're ready for anything!</p>
                </div>
              )}
              {score >= scenarios.length * 0.7 && score < scenarios.length && (
                <div className="pixel-card bg-green-500/10 border-green-500/20 mb-4 animate-pulse-glow">
                  <p className="pixel-text text-green-400 text-sm sm:text-base">⭐ CHAOS SURVIVOR! You've got solid travel instincts!</p>
                </div>
              )}
              {score < scenarios.length * 0.7 && (
                <div className="pixel-card bg-blue-500/10 border-blue-500/20 mb-4 animate-pulse-glow">
                  <p className="pixel-text text-blue-400 text-sm sm:text-base">📚 CHAOS APPRENTICE! Every disaster is a learning opportunity!</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleRestart}
                className="pixel-button-primary w-full sm:w-auto hover-float"
              >
                MORE CHAOS!
              </button>
              <button
                onClick={() => tripId ? navigate(`/trip/${tripId}`) : navigate('/')}
                className="pixel-button-secondary w-full sm:w-auto hover-wiggle"
              >
                ESCAPE TO SAFETY
              </button>
            </div>
          </div>
        ) : (
          <div className={`pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-red-500/30 animate-slide-in-up delay-400`}>
            {!showOutcome ? (
              <div>
                <div className="mb-6 sm:mb-8">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-2xl sm:text-3xl animate-bounce">{scenarios[currentScenarioIndex]?.emoji}</span>
                    <span className="pixel-text text-xs sm:text-sm text-blue-400 glow-text">
                      {scenarios[currentScenarioIndex]?.category?.toUpperCase()}
                    </span>
                    <span className={`pixel-text text-xs sm:text-sm ${getFunLevelColor(scenarios[currentScenarioIndex]?.funLevel)}`}>
                      {getFunLevelEmoji(scenarios[currentScenarioIndex]?.funLevel)} {scenarios[currentScenarioIndex]?.funLevel?.toUpperCase()}
                    </span>
                    {scenarios[currentScenarioIndex]?.country && scenarios[currentScenarioIndex]?.country !== 'any' && (
                      <span className="pixel-text text-xs sm:text-sm text-gray-500">
                        • {scenarios[currentScenarioIndex].country}
                      </span>
                    )}
                  </div>
                  <h3 className="pixel-text text-lg sm:text-xl text-yellow-400 mb-4 break-words glow-text">
                    {scenarios[currentScenarioIndex]?.title}
                  </h3>
                  <p className="outfit-text text-gray-300 leading-relaxed text-sm sm:text-base">
                    {scenarios[currentScenarioIndex]?.description}
                  </p>
                </div>

                <div className="space-y-4">
                  {scenarios[currentScenarioIndex]?.choices.map((choice, index) => (
                    <button
                      key={choice.id}
                      onClick={() => handleChoiceSelect(choice)}
                      className={`w-full text-left p-3 sm:p-4 bg-gray-800 border border-red-500/20 hover:border-red-500/40 hover:bg-gray-700 transition-all group animate-slide-in-left`}
                      style={{ animationDelay: `${index * 100 + 600}ms` }}
                    >
                      <span className="outfit-text text-white text-sm sm:text-base break-words group-hover:text-red-300 transition-colors">
                        {choice.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="animate-slide-in-up">
                <div className="text-center mb-6 sm:mb-8">
                  <div className="text-4xl sm:text-5xl mb-4 animate-bounce">
                    {selectedChoice?.isCorrect ? '🎉' : '💥'}
                  </div>
                  <h3 className="pixel-text text-lg sm:text-xl mb-2 glow-text">
                    {selectedChoice?.isCorrect ? 'NAILED IT!' : 'PLOT TWIST!'}
                  </h3>
                </div>

                <div className="pixel-card bg-gray-800/50 border-gray-700 mb-6 sm:mb-8">
                  <p className="outfit-text text-gray-300 mb-4 text-sm sm:text-base break-words">
                    {selectedChoice?.outcome}
                  </p>
                  
                  {selectedChoice?.funnyReaction && (
                    <div className="border-t border-gray-700 pt-4 mb-4">
                      <p className="outfit-text text-xs sm:text-sm text-yellow-400 break-words">
                        😂 {selectedChoice.funnyReaction}
                      </p>
                    </div>
                  )}
                  
                  {selectedChoice?.explanation && (
                    <div className="border-t border-gray-700 pt-4">
                      <p className="outfit-text text-xs sm:text-sm text-blue-400 break-words">
                        💡 {selectedChoice.explanation}
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <button
                    onClick={handleContinue}
                    className="pixel-button-primary w-full sm:w-auto hover-float"
                  >
                    {currentScenarioIndex < scenarios.length - 1 ? 'BRING MORE CHAOS!' : 'FINISH THE MADNESS!'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      </div>
    </div>
  );
};

export default GamePage;