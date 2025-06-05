import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Gamepad2, MapPin, CheckSquare, Calendar, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';

interface TripDetails {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
}

const TripDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [tripCount, setTripCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTripDetails = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
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
        }

        // Get total trip count for user
        const { count } = await supabase
          .from('trips')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id);

        setTripCount(count || 0);
      } catch (error) {
        console.error('Error fetching trip details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTripDetails();
  }, [tripId, navigate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysDifference = () => {
    if (!trip) return null;
    const start = new Date(trip.start_date);
    const today = new Date();
    const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getTripStatus = () => {
    const days = getDaysDifference();
    if (days === null) return '';
    if (days > 0) return `${days} days until your trip!`;
    if (days === 0) return 'Your trip starts today!';
    return 'Trip in progress';
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full px-4 py-12 bg-black text-white flex justify-center items-center">
        <div className="pixel-text">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full px-4 py-12 bg-black text-white flex justify-center">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <BackButton to="/my-trips" />
          <h2 className="pixel-text text-2xl">TRIP DASHBOARD</h2>
        </div>

        <div className="pixel-card bg-gray-900 p-6 mb-8 border-2 border-blue-500/20">
          <div className="flex items-center gap-4 mb-6">
            <Trophy className="h-12 w-12 text-yellow-400" />
            <div>
              <h3 className="pixel-text text-yellow-400 mb-2">
                TRIP #{tripCount}
              </h3>
              <p className="outfit-text text-gray-400">
                {tripCount === 1 ? "Congratulations on starting your first adventure!" : "Keep exploring, adventurer!"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-blue-500" />
              <span className="outfit-text text-lg">{trip?.destination}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-green-500" />
              <span className="outfit-text">
                {trip && `${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}`}
              </span>
            </div>
            <div className="pixel-text text-sm text-blue-400 mt-4">
              {getTripStatus()}
            </div>
          </div>
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