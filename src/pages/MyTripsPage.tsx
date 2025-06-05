import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isAuthenticated } from '../lib/supabase';
import { MapPin, Loader2, PlusCircle } from 'lucide-react';
import BackButton from '../components/BackButton';

interface Trip {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
}

const MyTripsPage: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndFetchTrips = async () => {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        navigate('/');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user!.id)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching trips:', error);
      } else {
        setTrips(data || []);
      }
      setLoading(false);
    };

    checkAuthAndFetchTrips();
  }, [navigate]);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = trips.filter(trip => trip.start_date >= today);
  const past = trips.filter(trip => trip.end_date < today);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <BackButton to="/" />
            <h2 className="pixel-text text-2xl">MY TRIPS</h2>
          </div>
          <button
            onClick={() => navigate('/create-trip')}
            className="pixel-button-secondary flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            NEW TRIP
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : trips.length > 0 ? (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <section>
                <h3 className="pixel-text text-blue-400 mb-4">🛫 UPCOMING TRIPS</h3>
                <div className="space-y-4">
                  {upcoming.map(trip => (
                    <div
                      key={trip.id}
                      onClick={() => navigate(`/trip/${trip.id}`)}
                      className="pixel-card bg-gray-900 p-6 border-2 border-blue-500/20 cursor-pointer hover:border-blue-500/40 transition-all"
                    >
                      <h4 className="pixel-text text-yellow-400 mb-2">{trip.destination}</h4>
                      <p className="outfit-text text-gray-400">
                        {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h3 className="pixel-text text-blue-400 mb-4">🗂️ PAST TRIPS</h3>
                <div className="space-y-4">
                  {past.map(trip => (
                    <div
                      key={trip.id}
                      onClick={() => navigate(`/trip/${trip.id}`)}
                      className="pixel-card bg-gray-900/50 p-6 border-2 border-blue-500/10 cursor-pointer hover:border-blue-500/20 transition-all"
                    >
                      <h4 className="pixel-text text-gray-400 mb-2">{trip.destination}</h4>
                      <p className="outfit-text text-gray-500">
                        {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="text-center py-16 pixel-card bg-gray-900 border-2 border-blue-500/20">
            <MapPin className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h3 className="pixel-text text-lg text-gray-300 mb-2">NO TRIPS YET</h3>
            <p className="outfit-text text-gray-500 mb-6">Start planning your next adventure!</p>
            <button
              onClick={() => navigate('/create-trip')}
              className="pixel-button-primary"
            >
              CREATE FIRST TRIP
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTripsPage;