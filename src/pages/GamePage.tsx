import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Trophy, Star, RotateCcw, Zap, Heart, Laugh } from 'lucide-react';
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
      <div className="min-h-screen bg-black text-white mobile-padding py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="w-6 sm:w-8 h-6 sm:h-8 text-blue-500 animate-spin mr-3" />
            <span className="pixel-text text-blue-400 text-sm sm:text-base">GENERATING CHAOS...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white mobile-padding py-6 sm:py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          <button 
            onClick={() => tripId ? navigate(`/trip/${tripId}`) : navigate('/')} 
            className="text-blue-400 hover:text-blue-300"
          >
            <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="pixel-text mobile-heading">WHERE'D I GO? 🎮</h2>
            {trip && (
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base break-words">
                Survive the chaos in {trip.destination}!
              </p>
            )}
            {!trip && (
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base">
                Random travel disasters await!
              </p>
            )}
          </div>
        </div>

        {/* Game Stats */}
        <div className="pixel-card bg-gray-900 mb-6 sm:mb-8 border-2 border-blue-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 sm:w-5 h-4 sm:h-5 text-yellow-400" />
                <span className="pixel-text text-yellow-400 text-sm sm:text-base">SURVIVAL SCORE: {score}/{scenarios.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 sm:w-5 h-4 sm:h-5 text-blue-400" />
                <span className="pixel-text text-blue-400 text-sm sm:text-base">CHAOS LEVEL: {Math.min(currentScenarioIndex + 1, scenarios.length)}/{scenarios.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 sm:w-5 h-4 sm:h-5 text-purple-400" />
                <span className="pixel-text text-purple-400 text-sm sm:text-base">FUN METER: {completedScenarios > 0 ? '🔥' : '😴'}</span>
              </div>
            </div>
            <button
              onClick={handleRestart}
              className="pixel-button-secondary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <RotateCcw className="w-3 sm:w-4 h-3 sm:h-4" />
              NEW CHAOS
            </button>
          </div>
          
          <div className="w-full bg-gray-700 h-3 mt-4 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-full transition-all duration-500"
              style={{ width: `${(completedScenarios / scenarios.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Game Content */}
        {isGameCompleted ? (
          <div className="pixel-card bg-gray-900 border-2 border-green-500/20 text-center">
            <div className="text-4xl sm:text-6xl mb-4">🎉</div>
            <h3 className="pixel-text text-lg sm:text-2xl text-green-400 mb-4">CHAOS SURVIVED!</h3>
            <p className="outfit-text text-gray-300 mb-6 text-sm sm:text-base">
              You survived {score} out of {scenarios.length} travel disasters like a pro!
            </p>
            
            <div className="mb-6 sm:mb-8">
              {score === scenarios.length && (
                <div className="pixel-card bg-yellow-500/10 border-yellow-500/20 mb-4">
                  <p className="pixel-text text-yellow-400 text-sm sm:text-base">🏆 PERFECT CHAOS MASTER! You're ready for anything!</p>
                </div>
              )}
              {score >= scenarios.length * 0.7 && score < scenarios.length && (
                <div className="pixel-card bg-green-500/10 border-green-500/20 mb-4">
                  <p className="pixel-text text-green-400 text-sm sm:text-base">⭐ CHAOS SURVIVOR! You've got solid travel instincts!</p>
                </div>
              )}
              {score < scenarios.length * 0.7 && (
                <div className="pixel-card bg-blue-500/10 border-blue-500/20 mb-4">
                  <p className="pixel-text text-blue-400 text-sm sm:text-base">📚 CHAOS APPRENTICE! Every disaster is a learning opportunity!</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleRestart}
                className="pixel-button-primary w-full sm:w-auto"
              >
                MORE CHAOS!
              </button>
              <button
                onClick={() => tripId ? navigate(`/trip/${tripId}`) : navigate('/')}
                className="pixel-button-secondary w-full sm:w-auto"
              >
                ESCAPE TO SAFETY
              </button>
            </div>
          </div>
        ) : (
          <div className="pixel-card bg-gray-900 border-2 border-blue-500/20">
            {!showOutcome ? (
              <div>
                <div className="mb-6">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-xl sm:text-2xl">{scenarios[currentScenarioIndex]?.emoji}</span>
                    <span className="pixel-text text-xs sm:text-sm text-blue-400">
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
                  <h3 className="pixel-text text-lg sm:text-xl text-yellow-400 mb-4 break-words">
                    {scenarios[currentScenarioIndex]?.title}
                  </h3>
                  <p className="outfit-text text-gray-300 leading-relaxed text-sm sm:text-base">
                    {scenarios[currentScenarioIndex]?.description}
                  </p>
                </div>

                <div className="space-y-4">
                  {scenarios[currentScenarioIndex]?.choices.map((choice) => (
                    <button
                      key={choice.id}
                      onClick={() => handleChoiceSelect(choice)}
                      className="w-full text-left p-3 sm:p-4 bg-gray-800 border border-blue-500/20 hover:border-blue-500/40 hover:bg-gray-700 transition-all group"
                    >
                      <span className="outfit-text text-white text-sm sm:text-base break-words group-hover:text-blue-300 transition-colors">
                        {choice.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-center mb-6">
                  <div className="text-3xl sm:text-4xl mb-4">
                    {selectedChoice?.isCorrect ? '🎉' : '💥'}
                  </div>
                  <h3 className="pixel-text text-lg sm:text-xl mb-2">
                    {selectedChoice?.isCorrect ? 'NAILED IT!' : 'PLOT TWIST!'}
                  </h3>
                </div>

                <div className="pixel-card bg-gray-800/50 border-gray-700 mb-6">
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
                    className="pixel-button-primary w-full sm:w-auto"
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