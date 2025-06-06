import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Trophy, Star, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GameScenario {
  id: string;
  title: string;
  description: string;
  choices: GameChoice[];
  country: string;
  category: string;
}

interface GameChoice {
  id: string;
  text: string;
  outcome: string;
  isCorrect: boolean;
  explanation?: string;
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

  useEffect(() => {
    const fetchTripAndGenerateScenarios = async () => {
      if (!tripId) {
        // If no trip ID, generate generic scenarios
        const genericScenarios = generateGenericScenarios();
        setScenarios(genericScenarios);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch trip details
        const { data: tripData } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single();

        if (tripData) {
          setTrip(tripData);
          const [city, country] = tripData.destination.split(', ');
          
          // Generate country-specific scenarios
          const countryScenarios = generateCountrySpecificScenarios(city, country);
          setScenarios(countryScenarios);
        }
      } catch (error) {
        console.error('Error fetching trip:', error);
        // Fallback to generic scenarios
        const genericScenarios = generateGenericScenarios();
        setScenarios(genericScenarios);
      } finally {
        setLoading(false);
      }
    };

    fetchTripAndGenerateScenarios();
  }, [tripId]);

  const generateCountrySpecificScenarios = (city: string, country: string): GameScenario[] => {
    const baseScenarios = [
      {
        id: '1',
        title: `Lost in ${city}`,
        description: `You're exploring ${city} and realize you've wandered into an unfamiliar neighborhood. Your phone battery is at 5% and you don't speak the local language fluently. What's your best move?`,
        country,
        category: 'Navigation',
        choices: [
          {
            id: '1a',
            text: 'Use your remaining battery to call an expensive taxi',
            outcome: 'You get back safely but spend a lot of money. Next time, download offline maps!',
            isCorrect: false,
            explanation: 'While safe, this is expensive and doesn\'t help you learn the area.'
          },
          {
            id: '1b',
            text: 'Find a local shop or restaurant and ask for help',
            outcome: 'Great choice! Locals are usually helpful and you might discover a hidden gem. Plus, you save your battery.',
            isCorrect: true,
            explanation: 'Locals often give the best directions and you might make a connection!'
          },
          {
            id: '1c',
            text: 'Keep wandering until you find something familiar',
            outcome: 'You waste hours and get more lost. Your phone dies and you panic. Always have a backup plan!',
            isCorrect: false,
            explanation: 'This could lead to dangerous situations, especially at night.'
          }
        ]
      },
      {
        id: '2',
        title: `Restaurant Confusion in ${city}`,
        description: `You're at a popular local restaurant in ${city}. The menu is entirely in the local language and the waiter doesn't speak English. You're hungry but don't want to order something you'll hate.`,
        country,
        category: 'Food',
        choices: [
          {
            id: '2a',
            text: 'Point at what other diners are eating',
            outcome: 'Smart move! You end up with a delicious local dish and the other diners help explain what it is.',
            isCorrect: true,
            explanation: 'This is a great way to discover authentic local cuisine!'
          },
          {
            id: '2b',
            text: 'Use a translation app to translate the entire menu',
            outcome: 'The app mistranslates several items and you end up with something unexpected. Sometimes technology fails!',
            isCorrect: false,
            explanation: 'Translation apps can be unreliable for food terms and cultural context.'
          },
          {
            id: '2c',
            text: 'Leave and find a tourist restaurant with English menu',
            outcome: 'You miss out on authentic local cuisine and pay tourist prices. You play it safe but don\'t experience the real culture.',
            isCorrect: false,
            explanation: 'You\'ll miss authentic experiences and often pay more for less authentic food.'
          }
        ]
      }
    ];

    // Add country-specific scenarios based on common issues
    const countrySpecific = getCountrySpecificScenarios(city, country);
    
    return [...baseScenarios, ...countrySpecific].slice(0, 5); // Limit to 5 scenarios
  };

  const getCountrySpecificScenarios = (city: string, country: string): GameScenario[] => {
    const scenarios: GameScenario[] = [];
    
    // European countries
    if (['France', 'Germany', 'Italy', 'Spain', 'Netherlands', 'United Kingdom'].includes(country)) {
      scenarios.push({
        id: 'eu_transport',
        title: `Public Transport in ${city}`,
        description: `You need to get across ${city} quickly. You see buses, trams, and metro options but don't understand the ticketing system. There are different zones and ticket types.`,
        country,
        category: 'Transport',
        choices: [
          {
            id: 'eu_t1',
            text: 'Buy the most expensive ticket to be safe',
            outcome: 'You overpay significantly but get where you need to go. Research ticket types beforehand next time!',
            isCorrect: false,
            explanation: 'European transport often has day passes that are more economical.'
          },
          {
            id: 'eu_t2',
            text: 'Ask a local or transport worker for help',
            outcome: 'Perfect! They explain the zone system and help you buy the right ticket. You save money and learn the system.',
            isCorrect: true,
            explanation: 'Transport workers are usually helpful and can explain the best options.'
          },
          {
            id: 'eu_t3',
            text: 'Just hop on without a ticket and hope for the best',
            outcome: 'You get caught by ticket inspectors and face a hefty fine. European transport is strictly monitored!',
            isCorrect: false,
            explanation: 'European cities have frequent ticket checks with expensive fines.'
          }
        ]
      });
    }

    // Asian countries
    if (['Japan', 'China', 'Thailand', 'Vietnam', 'South Korea'].includes(country)) {
      scenarios.push({
        id: 'asia_culture',
        title: `Cultural Etiquette in ${city}`,
        description: `You're visiting a traditional temple in ${city}. There are other tourists taking selfies everywhere, but you notice locals seem to be following different rules.`,
        country,
        category: 'Culture',
        choices: [
          {
            id: 'asia_c1',
            text: 'Follow what other tourists are doing',
            outcome: 'You unknowingly disrespect local customs. A monk politely corrects you, but you feel embarrassed.',
            isCorrect: false,
            explanation: 'Other tourists might not know the proper etiquette either.'
          },
          {
            id: 'asia_c2',
            text: 'Observe locals and copy their behavior',
            outcome: 'Excellent choice! You show respect for local customs and even receive a blessing from a monk.',
            isCorrect: true,
            explanation: 'Observing and respecting local customs shows cultural sensitivity.'
          },
          {
            id: 'asia_c3',
            text: 'Ask the temple staff about proper etiquette',
            outcome: 'Great approach! They appreciate your respect and give you a mini cultural lesson.',
            isCorrect: true,
            explanation: 'Asking shows respect and willingness to learn.'
          }
        ]
      });
    }

    // American countries
    if (['United States', 'Canada', 'Mexico', 'Brazil', 'Argentina'].includes(country)) {
      scenarios.push({
        id: 'americas_tip',
        title: `Tipping Culture in ${city}`,
        description: `You've just finished a great meal at a restaurant in ${city}. The service was good and the bill comes to $50. You're unsure about the local tipping customs.`,
        country,
        category: 'Culture',
        choices: [
          {
            id: 'am_t1',
            text: 'Leave no tip - the service charge should be included',
            outcome: country === 'United States' ? 'The server is visibly upset. In the US, 18-20% tip is expected for good service!' : 'This might be okay depending on local customs, but asking would have been better.',
            isCorrect: country !== 'United States',
            explanation: 'Tipping customs vary greatly between countries.'
          },
          {
            id: 'am_t2',
            text: 'Leave 15-20% tip',
            outcome: country === 'United States' ? 'Perfect! This is the standard in the US and the server appreciates it.' : 'You\'re generous, but this might be more than necessary in this country.',
            isCorrect: country === 'United States',
            explanation: 'US has strong tipping culture, but other countries vary.'
          },
          {
            id: 'am_t3',
            text: 'Ask the server or check local customs online',
            outcome: 'Smart approach! You learn the local tipping culture and tip appropriately.',
            isCorrect: true,
            explanation: 'When in doubt, asking or researching is always the best approach.'
          }
        ]
      });
    }

    return scenarios;
  };

  const generateGenericScenarios = (): GameScenario[] => {
    return [
      {
        id: 'generic_1',
        title: 'Airport Security Delay',
        description: 'You arrive at the airport and security lines are extremely long. Your flight boards in 45 minutes. What do you do?',
        country: 'Global',
        category: 'Travel',
        choices: [
          {
            id: 'g1a',
            text: 'Panic and try to cut in line',
            outcome: 'Other passengers get angry and security removes you from the line. You miss your flight.',
            isCorrect: false,
            explanation: 'Cutting in line creates conflict and wastes more time.'
          },
          {
            id: 'g1b',
            text: 'Politely ask airport staff about faster options',
            outcome: 'They direct you to a shorter line for your flight type. You make it just in time!',
            isCorrect: true,
            explanation: 'Airport staff know the best solutions and are there to help.'
          },
          {
            id: 'g1c',
            text: 'Accept you might miss the flight and start rebooking',
            outcome: 'You give up too early and pay expensive rebooking fees, but you actually would have made it.',
            isCorrect: false,
            explanation: 'Don\'t give up too quickly - explore all options first.'
          }
        ]
      },
      {
        id: 'generic_2',
        title: 'Language Barrier Emergency',
        description: 'You feel sick and need to find a pharmacy, but you don\'t speak the local language and your translation app isn\'t working.',
        country: 'Global',
        category: 'Health',
        choices: [
          {
            id: 'g2a',
            text: 'Use gestures and point to your symptoms',
            outcome: 'The pharmacist understands and helps you find the right medicine. Universal gestures work!',
            isCorrect: true,
            explanation: 'Body language is universal and people want to help when you\'re sick.'
          },
          {
            id: 'g2b',
            text: 'Go back to your hotel and suffer through it',
            outcome: 'Your condition worsens and you waste a day of your trip feeling terrible.',
            isCorrect: false,
            explanation: 'Don\'t let language barriers prevent you from getting help when sick.'
          },
          {
            id: 'g2c',
            text: 'Find someone who speaks English to help translate',
            outcome: 'A helpful local assists you and you get the medicine you need. People are generally kind!',
            isCorrect: true,
            explanation: 'Many people speak some English and are willing to help travelers.'
          }
        ]
      }
    ];
  };

  const handleChoiceSelect = (choice: GameChoice) => {
    setSelectedChoice(choice);
    setShowOutcome(true);
    
    if (choice.isCorrect) {
      setScore(score + 1);
    }
    
    setCompletedScenarios(completedScenarios + 1);
  };

  const handleContinue = () => {
    if (currentScenarioIndex < scenarios.length - 1) {
      setCurrentScenarioIndex(currentScenarioIndex + 1);
      setSelectedChoice(null);
      setShowOutcome(false);
    } else {
      // Game completed
      setShowOutcome(false);
      setSelectedChoice(null);
    }
  };

  const handleRestart = () => {
    setCurrentScenarioIndex(0);
    setSelectedChoice(null);
    setShowOutcome(false);
    setScore(0);
    setCompletedScenarios(0);
  };

  const isGameCompleted = completedScenarios >= scenarios.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white mobile-padding py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="w-6 sm:w-8 h-6 sm:h-8 text-blue-500 animate-spin mr-3" />
            <span className="pixel-text text-blue-400 text-sm sm:text-base">GENERATING SCENARIOS...</span>
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
            <h2 className="pixel-text mobile-heading">WHERE'D I GO?</h2>
            {trip && (
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base break-words">
                Travel scenarios for {trip.destination}
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
                <span className="pixel-text text-yellow-400 text-sm sm:text-base">SCORE: {score}/{scenarios.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 sm:w-5 h-4 sm:h-5 text-blue-400" />
                <span className="pixel-text text-blue-400 text-sm sm:text-base">SCENARIO: {Math.min(currentScenarioIndex + 1, scenarios.length)}/{scenarios.length}</span>
              </div>
            </div>
            <button
              onClick={handleRestart}
              className="pixel-button-secondary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <RotateCcw className="w-3 sm:w-4 h-3 sm:h-4" />
              RESTART
            </button>
          </div>
          
          <div className="w-full bg-gray-700 h-2 mt-4 rounded-full overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${(completedScenarios / scenarios.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Game Content */}
        {isGameCompleted ? (
          <div className="pixel-card bg-gray-900 border-2 border-green-500/20 text-center">
            <div className="text-4xl sm:text-6xl mb-4">🎉</div>
            <h3 className="pixel-text text-lg sm:text-2xl text-green-400 mb-4">GAME COMPLETED!</h3>
            <p className="outfit-text text-gray-300 mb-6 text-sm sm:text-base">
              You scored {score} out of {scenarios.length} scenarios correctly!
            </p>
            
            <div className="mb-6 sm:mb-8">
              {score === scenarios.length && (
                <div className="pixel-card bg-yellow-500/10 border-yellow-500/20 mb-4">
                  <p className="pixel-text text-yellow-400 text-sm sm:text-base">🏆 PERFECT SCORE! You're a travel expert!</p>
                </div>
              )}
              {score >= scenarios.length * 0.7 && score < scenarios.length && (
                <div className="pixel-card bg-green-500/10 border-green-500/20 mb-4">
                  <p className="pixel-text text-green-400 text-sm sm:text-base">⭐ GREAT JOB! You know how to handle travel situations!</p>
                </div>
              )}
              {score < scenarios.length * 0.7 && (
                <div className="pixel-card bg-blue-500/10 border-blue-500/20 mb-4">
                  <p className="pixel-text text-blue-400 text-sm sm:text-base">📚 GOOD EFFORT! Practice makes perfect in travel!</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleRestart}
                className="pixel-button-primary w-full sm:w-auto"
              >
                PLAY AGAIN
              </button>
              <button
                onClick={() => tripId ? navigate(`/trip/${tripId}`) : navigate('/')}
                className="pixel-button-secondary w-full sm:w-auto"
              >
                BACK TO DASHBOARD
              </button>
            </div>
          </div>
        ) : (
          <div className="pixel-card bg-gray-900 border-2 border-blue-500/20">
            {!showOutcome ? (
              <div>
                <div className="mb-6">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="pixel-text text-xs sm:text-sm text-blue-400">
                      {scenarios[currentScenarioIndex]?.category?.toUpperCase()}
                    </span>
                    {scenarios[currentScenarioIndex]?.country && (
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
                      className="w-full text-left p-3 sm:p-4 bg-gray-800 border border-blue-500/20 hover:border-blue-500/40 hover:bg-gray-700 transition-all"
                    >
                      <span className="outfit-text text-white text-sm sm:text-base break-words">{choice.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-center mb-6">
                  <div className="text-3xl sm:text-4xl mb-4">
                    {selectedChoice?.isCorrect ? '✅' : '❌'}
                  </div>
                  <h3 className="pixel-text text-lg sm:text-xl mb-2">
                    {selectedChoice?.isCorrect ? 'GREAT CHOICE!' : 'LEARNING MOMENT!'}
                  </h3>
                </div>

                <div className="pixel-card bg-gray-800/50 border-gray-700 mb-6">
                  <p className="outfit-text text-gray-300 mb-4 text-sm sm:text-base break-words">
                    {selectedChoice?.outcome}
                  </p>
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
                    {currentScenarioIndex < scenarios.length - 1 ? 'NEXT SCENARIO' : 'FINISH GAME'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePage;