import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Calendar, ThumbsUp, Gamepad2, BookMarked, CheckSquare } from 'lucide-react';

interface LocationState {
  destination: string;
  startDate: string;
  endDate: string;
}

const TripCreatedPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="pixel-card bg-gray-900 p-8 border-2 border-blue-500/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-4">
              <ThumbsUp className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="pixel-text text-2xl mb-2">ADVENTURE AWAITS!</h2>
            <p className="outfit-text text-gray-400">Your trip has been created successfully</p>
          </div>

          <div className="pixel-card bg-gray-800/50 border-blue-500/10 mb-8">
            <div className="flex items-center mb-3">
              <MapPin className="h-5 w-5 text-blue-500 mr-3" />
              <span className="outfit-text text-lg">{state?.destination || 'Destination not specified'}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-blue-500 mr-3" />
              <span className="outfit-text text-lg">
                {state?.startDate && state?.endDate
                  ? `${formatDate(state.startDate)} - ${formatDate(state.endDate)}`
                  : 'Dates not specified'}
              </span>
            </div>
          </div>

          <h3 className="pixel-text text-lg mb-4 text-blue-400">NEXT STEPS</h3>
          
          <div className="grid grid-cols-1 gap-4 mb-8">
            <button
              onClick={() => navigate('/checklist')}
              className="pixel-card flex items-center p-4 hover:bg-gray-800/50 transition-all"
            >
              <CheckSquare className="h-6 w-6 text-green-500 mr-3" />
              <div className="text-left">
                <h4 className="outfit-text font-semibold">Pre-Trip Checklist</h4>
                <p className="outfit-text text-sm text-gray-400">Stay organized with our travel checklist</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/game')}
              className="pixel-card flex items-center p-4 hover:bg-gray-800/50 transition-all"
            >
              <Gamepad2 className="h-6 w-6 text-yellow-500 mr-3" />
              <div className="text-left">
                <h4 className="outfit-text font-semibold">Try Travel Scenarios</h4>
                <p className="outfit-text text-sm text-gray-400">Practice handling travel situations</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/tips')}
              className="pixel-card flex items-center p-4 hover:bg-gray-800/50 transition-all"
            >
              <BookMarked className="h-6 w-6 text-purple-500 mr-3" />
              <div className="text-left">
                <h4 className="outfit-text font-semibold">Browse Travel Tips</h4>
                <p className="outfit-text text-sm text-gray-400">Learn from experienced travelers</p>
              </div>
            </button>
          </div>

          <button
            onClick={() => navigate('/')}
            className="pixel-button-secondary w-full"
          >
            BACK TO HOME
          </button>
        </div>
      </div>
    </div>
  );
};

export default TripCreatedPage;