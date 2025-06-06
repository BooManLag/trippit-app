import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Trophy, Star, RotateCcw, Zap, Heart, Laugh } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AuthModal from '../components/AuthModal';

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
      if (!tripId) {
        const genericScenarios = generateGenericScenarios();
        setScenarios(genericScenarios);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const { data: tripData } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single();

        if (tripData) {
          setTrip(tripData);
          const [city, country] = tripData.destination.split(', ');
          
          const countryScenarios = generateCountrySpecificScenarios(city, country);
          setScenarios(countryScenarios);
        }
      } catch (error) {
        console.error('Error fetching trip:', error);
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
        title: `The Great ${city} Navigation Disaster! 🗺️`,
        description: `You're confidently strutting through ${city} when you realize you've been following Google Maps in the wrong direction for 30 minutes. Your phone is dying, you're sweating, and a local just gave you a look that says "another lost tourist." What's your move, navigator?`,
        country,
        category: 'Navigation',
        funLevel: 'spicy' as const,
        emoji: '🧭',
        choices: [
          {
            id: '1a',
            text: 'Panic-call an expensive taxi while dramatically waving your arms',
            outcome: 'The taxi driver laughs at your dramatic entrance and charges you double for the "entertainment fee." You arrive safely but your wallet is crying! 💸',
            isCorrect: false,
            explanation: 'While safe, this is expensive and doesn\'t help you learn the area.',
            funnyReaction: 'Your dramatic arm-waving becomes a local meme! 📱'
          },
          {
            id: '1b',
            text: 'Channel your inner detective and ask locals for help',
            outcome: 'Plot twist! The friendly local not only gives you perfect directions but also recommends a hidden gem restaurant. You just unlocked the "Local Whisperer" achievement! 🏆',
            isCorrect: true,
            explanation: 'Locals often give the best directions and you might make a connection!',
            funnyReaction: 'You accidentally learn 5 new words in the local language! 🗣️'
          },
          {
            id: '1c',
            text: 'Keep wandering and hope for a miracle',
            outcome: 'Congratulations! You\'ve discovered every dead end in ${city}. Your phone dies, you\'re more lost than a penguin in the desert, and you\'re now the star of a "How NOT to travel" documentary! 🎬',
            isCorrect: false,
            explanation: 'This could lead to dangerous situations, especially at night.',
            funnyReaction: 'You accidentally become a street performer by looking so confused! 🎭'
          }
        ]
      },
      {
        id: '2',
        title: `The ${city} Menu Mystery! 🍽️`,
        description: `You're at the most Instagram-worthy restaurant in ${city}, but the menu looks like ancient hieroglyphics. The waiter is staring at you expectantly, other diners are watching, and your stomach is growling louder than a motorcycle. Time to make a choice, food adventurer!`,
        country,
        category: 'Food',
        funLevel: 'chaotic' as const,
        emoji: '🍜',
        choices: [
          {
            id: '2a',
            text: 'Point dramatically at what the coolest-looking person is eating',
            outcome: 'JACKPOT! You just ordered the restaurant\'s signature dish that\'s not even on the menu. The other diners are impressed, the chef comes out to high-five you, and you feel like a culinary genius! 👨‍🍳✨',
            isCorrect: true,
            explanation: 'This is a great way to discover authentic local cuisine!',
            funnyReaction: 'You accidentally ordered the "tourist challenge" dish and survived! 🌶️'
          },
          {
            id: '2b',
            text: 'Frantically use Google Translate on the entire menu',
            outcome: 'Google Translate thinks you want "Fried Happiness with Confused Vegetables." You get something that might be food, might be art. It tastes... interesting. The waiter is trying not to laugh! 😅',
            isCorrect: false,
            explanation: 'Translation apps can be unreliable for food terms and cultural context.',
            funnyReaction: 'Your phone starts smoking from translating too fast! 📱💨'
          },
          {
            id: '2c',
            text: 'Retreat to the safety of McDonald\'s',
            outcome: 'You successfully order a Big Mac in ${city}. Congratulations, you\'ve traveled thousands of miles to eat the exact same thing you could get at home. Your Instagram followers are... confused. 🍔😐',
            isCorrect: false,
            explanation: 'You\'ll miss authentic experiences and often pay more for less authentic food.',
            funnyReaction: 'The McDonald\'s mascot judges you in the local language! 🤡'
          }
        ]
      },
      {
        id: '3',
        title: `The Great ${city} Bathroom Hunt! 🚽`,
        description: `Nature calls urgently while you're exploring ${city}, but every bathroom requires a PhD in local customs to access. Some need coins, some need codes, some need a blood sacrifice (probably). You're doing the international "I need a bathroom" dance. What's your strategy?`,
        country,
        category: 'Culture',
        funLevel: 'chaotic' as const,
        emoji: '🚻',
        choices: [
          {
            id: '3a',
            text: 'Buy the smallest item at every café until someone takes pity',
            outcome: 'You now own 47 packets of sugar and have visited 12 cafés, but you finally found relief! You\'re also accidentally caffeinated enough to power a small city. Mission accomplished? ☕⚡',
            isCorrect: true,
            explanation: 'Buying something small is usually the polite way to use facilities.',
            funnyReaction: 'You\'re now known as the "Sugar Packet Collector" of ${city}! 📦'
          },
          {
            id: '3b',
            text: 'Ask random strangers using elaborate charades',
            outcome: 'Your interpretive bathroom dance becomes a viral sensation! Three people filmed you, but someone eventually understood and helped. You\'re famous, but for all the wrong reasons! 🕺📱',
            isCorrect: false,
            explanation: 'While creative, this might be embarrassing and not always effective.',
            funnyReaction: 'Your dance moves get remixed into a TikTok trend! 🎵'
          },
          {
            id: '3c',
            text: 'Hold it until you get back to your hotel',
            outcome: 'You develop superhuman bladder control and the walking speed of a caffeinated cheetah. You make it back, but you\'ve missed half the city\'s attractions in your sprint! 🏃‍♂️💨',
            isCorrect: false,
            explanation: 'This is uncomfortable and might make you miss out on experiences.',
            funnyReaction: 'You accidentally break the ${city} speed-walking record! 🏃‍♂️🏆'
          }
        ]
      }
    ];

    const countrySpecific = getCountrySpecificScenarios(city, country);
    
    return [...baseScenarios, ...countrySpecific].slice(0, 8);
  };

  const getCountrySpecificScenarios = (city: string, country: string): GameScenario[] => {
    const scenarios: GameScenario[] = [];
    
    if (['France', 'Germany', 'Italy', 'Spain', 'Netherlands', 'United Kingdom'].includes(country)) {
      scenarios.push({
        id: 'eu_transport',
        title: `The ${city} Transport Puzzle! 🚇`,
        description: `You're staring at the ${city} transport map like it's a NASA blueprint. There are zones, day passes, weekly passes, tourist passes, and probably a secret handshake required. The locals are zooming past you like transport ninjas. Time to crack the code!`,
        country,
        category: 'Transport',
        funLevel: 'spicy' as const,
        emoji: '🎫',
        choices: [
          {
            id: 'eu_t1',
            text: 'Buy the most expensive ticket because expensive = good, right?',
            outcome: 'You just bought a first-class annual pass for the entire European Union. You could probably commute to Mars with this ticket! Your bank account is crying, but hey, you\'re definitely covered! 🚀💸',
            isCorrect: false,
            explanation: 'European transport often has day passes that are more economical.',
            funnyReaction: 'The ticket machine prints a receipt longer than your arm! 📜'
          },
          {
            id: 'eu_t2',
            text: 'Find a transport worker and unleash your best charades performance',
            outcome: 'Your interpretive dance of "confused tourist needs help" wins over a kind transport worker who explains everything! You get the perfect ticket AND a new friend. Plus, your charades skills are now legendary! 🎭✨',
            isCorrect: true,
            explanation: 'Transport workers are usually helpful and can explain the best options.',
            funnyReaction: 'You accidentally learn the transport worker\'s life story! 👥'
          },
          {
            id: 'eu_t3',
            text: 'YOLO! Jump on and hope nobody checks tickets',
            outcome: 'Plot twist: The ticket inspector appears like a transport ninja! You get a fine that costs more than your entire trip budget. You\'re now the cautionary tale other tourists whisper about! 🥷💰',
            isCorrect: false,
            explanation: 'European cities have frequent ticket checks with expensive fines.',
            funnyReaction: 'The fine is so expensive, it gets its own payment plan! 📋'
          }
        ]
      });

      scenarios.push({
        id: 'eu_cafe',
        title: `The ${city} Café Conundrum! ☕`,
        description: `You walk into a charming ${city} café and immediately realize you've entered a cultural minefield. Do you seat yourself? Wait to be seated? Order at the counter? The locals are giving you looks that range from amused to concerned. The pressure is real!`,
        country,
        category: 'Culture',
        funLevel: 'mild' as const,
        emoji: '☕',
        choices: [
          {
            id: 'eu_c1',
            text: 'Stand awkwardly by the door until someone acknowledges your existence',
            outcome: 'After 15 minutes of awkward hovering, a kind waiter takes pity on you and explains the system. You get seated, but you\'ve become the café\'s entertainment for the day! 🎪',
            isCorrect: true,
            explanation: 'When in doubt, waiting for guidance is usually the safest approach.',
            funnyReaction: 'You become the café\'s unofficial greeter! 👋'
          },
          {
            id: 'eu_c2',
            text: 'Confidently march to any empty table like you own the place',
            outcome: 'You accidentally sit at the table reserved for the mayor\'s daily coffee meeting. The entire café watches in fascination as you unknowingly become part of local politics! 🏛️',
            isCorrect: false,
            explanation: 'Different cafés have different seating protocols.',
            funnyReaction: 'You accidentally get invited to the mayor\'s book club! 📚'
          },
          {
            id: 'eu_c3',
            text: 'Order 47 coffees at the counter to show you mean business',
            outcome: 'The barista thinks you\'re catering a conference and starts preparing enough coffee to fuel a small army. You now own more caffeine than some countries\' strategic reserves! ☕⚡',
            isCorrect: false,
            explanation: 'Observing first is usually better than making assumptions.',
            funnyReaction: 'You accidentally become ${city}\'s coffee distributor! 📦'
          }
        ]
      });
    }

    if (['Japan', 'China', 'Thailand', 'Vietnam', 'South Korea'].includes(country)) {
      scenarios.push({
        id: 'asia_bow',
        title: `The ${city} Bowing Bonanza! 🙇`,
        description: `You're at a traditional establishment in ${city} and everyone is bowing at different angles like they're performing synchronized geometry. You need to bow back, but how deep? Too shallow and you're rude, too deep and you might fall over. The pressure is intense!`,
        country,
        category: 'Culture',
        funLevel: 'spicy' as const,
        emoji: '🙇‍♂️',
        choices: [
          {
            id: 'asia_b1',
            text: 'Copy the person next to you like a cultural mirror',
            outcome: 'Perfect strategy! You successfully mirror everyone and blend in seamlessly. You\'ve unlocked the "Cultural Chameleon" achievement and earned the respect of the locals! 🦎✨',
            isCorrect: true,
            explanation: 'Observing and copying local behavior shows respect and cultural awareness.',
            funnyReaction: 'You accidentally start a bowing chain reaction! 🔄'
          },
          {
            id: 'asia_b2',
            text: 'Go full 90-degree bow to show maximum respect',
            outcome: 'You bow so deeply that you nearly tip over! Everyone rushes to help you, and while your enthusiasm is appreciated, you\'ve become the "overly enthusiastic tourist" legend! 🤸‍♂️',
            isCorrect: false,
            explanation: 'Different situations require different levels of formality.',
            funnyReaction: 'Your bow is so deep, you discover a new yoga pose! 🧘‍♂️'
          },
          {
            id: 'asia_b3',
            text: 'Panic and do a weird half-wave, half-bow hybrid',
            outcome: 'You invent a new greeting that confuses everyone! It\'s not quite a bow, not quite a wave, but somehow it\'s endearing. You\'ve accidentally created the "${city} Tourist Special!" 👋🙇‍♂️',
            isCorrect: false,
            explanation: 'Consistency in cultural gestures is important.',
            funnyReaction: 'Your hybrid greeting becomes a local inside joke! 😄'
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
        title: 'The Airport Security Time Warp! ⏰',
        description: 'You arrive at the airport and the security line looks like a Black Friday sale at a electronics store. Your flight boards in 45 minutes, and you\'re currently positioned somewhere between "this might work" and "I should start planning my next vacation from this airport." What\'s your move, time traveler?',
        country: 'Global',
        category: 'Travel',
        funLevel: 'chaotic' as const,
        emoji: '✈️',
        choices: [
          {
            id: 'g1a',
            text: 'Channel your inner action hero and dramatically cut in line',
            outcome: 'You become the villain in everyone else\'s travel story! Security escorts you to the back of an even longer line, and you\'re now famous on social media for all the wrong reasons. Your flight waves goodbye from the window! 👋✈️',
            isCorrect: false,
            explanation: 'Cutting in line creates conflict and wastes more time.',
            funnyReaction: 'You accidentally start a conga line instead! 💃'
          },
          {
            id: 'g1b',
            text: 'Find an airport employee and explain your situation with puppy dog eyes',
            outcome: 'Your combination of politeness and mild panic works! The airport angel directs you to a faster security line for your flight. You make it with 5 minutes to spare and feel like you\'ve won the lottery! 🎰✨',
            isCorrect: true,
            explanation: 'Airport staff know the best solutions and are there to help.',
            funnyReaction: 'The airport employee adopts you as their favorite passenger! 🏆'
          },
          {
            id: 'g1c',
            text: 'Accept defeat and start booking your "extended airport vacation"',
            outcome: 'You give up faster than a phone battery at 1%! Turns out you would have made it easily, but now you\'re paying rebooking fees that cost more than your original trip. The airport becomes your expensive new home! 🏠💸',
            isCorrect: false,
            explanation: 'Don\'t give up too quickly - explore all options first.',
            funnyReaction: 'You become the airport\'s unofficial mascot! 🎭'
          }
        ]
      },
      {
        id: 'generic_2',
        title: 'The Universal Language of "I Feel Terrible!" 🤒',
        description: 'You wake up feeling like you\'ve been hit by a truck driven by a very angry elephant. You need medicine, but you\'re in a country where your language skills are about as useful as a chocolate teapot. Your translation app has given up on life. Time to get creative!',
        country: 'Global',
        category: 'Health',
        funLevel: 'spicy' as const,
        emoji: '💊',
        choices: [
          {
            id: 'g2a',
            text: 'Become a master of interpretive illness dance',
            outcome: 'Your dramatic performance of "sick tourist in distress" wins an Oscar in the pharmacist\'s heart! They understand immediately and help you find the perfect medicine. You\'ve discovered that suffering is indeed a universal language! 🎭💊',
            isCorrect: true,
            explanation: 'Body language is universal and people want to help when you\'re sick.',
            funnyReaction: 'Your illness dance becomes a viral TikTok trend! 📱'
          },
          {
            id: 'g2b',
            text: 'Retreat to your hotel room and become one with the bed',
            outcome: 'You spend the day having a very expensive staring contest with the ceiling. Your condition gets worse, you miss all your planned activities, and you\'ve basically paid premium prices to be sick in a foreign country! 🛏️😷',
            isCorrect: false,
            explanation: 'Don\'t let language barriers prevent you from getting help when sick.',
            funnyReaction: 'You become best friends with room service! 🍲'
          },
          {
            id: 'g2c',
            text: 'Find a local superhero (aka someone who speaks English)',
            outcome: 'You discover that kindness is the real universal language! A helpful local not only translates for you but also recommends the best pharmacy and even walks you there. Faith in humanity: restored! 🦸‍♀️✨',
            isCorrect: true,
            explanation: 'Many people speak some English and are willing to help travelers.',
            funnyReaction: 'You accidentally become pen pals with your translator! ✉️'
          }
        ]
      },
      {
        id: 'generic_3',
        title: 'The WiFi Password Quest! 📶',
        description: 'You\'re at a café desperately trying to connect to WiFi, but the password is written in what appears to be ancient runes. You need internet to navigate, translate, and prove to Instagram that you\'re having fun. The barista is busy, and your data plan is crying. What\'s your strategy, digital nomad?',
        country: 'Global',
        category: 'Technology',
        funLevel: 'mild' as const,
        emoji: '📱',
        choices: [
          {
            id: 'g3a',
            text: 'Try every possible combination like you\'re hacking the Matrix',
            outcome: 'After 47 attempts, you successfully guess "password123" and feel like a cybersecurity genius! Unfortunately, you\'ve been trying for so long that your coffee is now cold and the café is closing! ☕❄️',
            isCorrect: false,
            explanation: 'Guessing passwords wastes time and might not work.',
            funnyReaction: 'You accidentally connect to your neighbor\'s WiFi from 3 countries away! 🌍'
          },
          {
            id: 'g3b',
            text: 'Use your international charm to ask the barista nicely',
            outcome: 'Your polite request and genuine smile work like magic! The barista not only gives you the password but also recommends the best local spots to visit. You\'ve unlocked the "Local Insider" achievement! 🗝️✨',
            isCorrect: true,
            explanation: 'Simply asking is often the most effective approach.',
            funnyReaction: 'The barista becomes your unofficial tour guide! 🗺️'
          },
          {
            id: 'g3c',
            text: 'Embrace the digital detox and go completely offline',
            outcome: 'You discover the ancient art of "asking for directions with your mouth" and "looking at things with your eyes!" It\'s terrifying but liberating. You survive, but your Instagram followers think you\'ve been kidnapped! 📵🆘',
            isCorrect: false,
            explanation: 'While digital detox can be good, you might need internet for important travel functions.',
            funnyReaction: 'You accidentally become a zen master of offline travel! 🧘‍♂️'
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
              RESTART CHAOS
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