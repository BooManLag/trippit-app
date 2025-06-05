import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Gamepad2, MapPin, CheckSquare } from 'lucide-react';
import BackButton from '../components/BackButton';

const TripDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { tripId } = useParams();

  return (
    <div className="min-h-screen w-full px-4 py-12 bg-black text-white flex justify-center">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <BackButton to="/my-trips" />
          <h2 className="pixel-text text-2xl">TRIP DASHBOARD</h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <button
            onClick={() => navigate(`/game?tripId=${tripId}`)}
            className="pixel-card flex items-center p-6 hover:bg-gray-800/50 transition-all"
          >
            <Gamepad2 className="h-8 w-8 text-yellow-500 mr-4" />
            <div className="text-left">
              <h4 className="pixel-text text-lg mb-2">WHERE'D I GO?</h4>
              <p className="outfit-text text-gray-400">Practice handling travel scenarios</p>
            </div>
          </button>

          <button
            onClick={() => navigate(`/tips?tripId=${tripId}`)}
            className="pixel-card flex items-center p-6 hover:bg-gray-800/50 transition-all"
          >
            <MapPin className="h-8 w-8 text-blue-500 mr-4" />
            <div className="text-left">
              <h4 className="pixel-text text-lg mb-2">CITY MODE</h4>
              <p className="outfit-text text-gray-400">Get location-specific tips and advice</p>
            </div>
          </button>

          <button
            onClick={() => navigate(`/checklist?tripId=${tripId}`)}
            className="pixel-card flex items-center p-6 hover:bg-gray-800/50 transition-all"
          >
            <CheckSquare className="h-8 w-8 text-green-500 mr-4" />
            <div className="text-left">
              <h4 className="pixel-text text-lg mb-2">TRIP CHECKLIST</h4>
              <p className="outfit-text text-gray-400">Track your trip preparation progress</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TripDashboardPage;