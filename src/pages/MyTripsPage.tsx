import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isAuthenticated } from '../lib/supabase';
import { MapPin, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import DeleteModal from '../components/DeleteModal';

interface Trip {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
}

const MyTripsPage: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchTrips = async () => {
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

  useEffect(() => {
    const checkAuthAndFetchTrips = async () => {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        navigate('/');
        return;
      }
      fetchTrips();
    };

    checkAuthAndFetchTrips();
  }, [navigate]);

  const handleDeleteClick = (tripId: string) => {
    setTripToDelete(tripId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!tripToDelete) return;

    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripToDelete);

    if (error) {
      console.error('Error deleting trip:', error);
    } else {
      await fetchTrips();
    }
  };

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
    <div className="min-h-screen bg-black text-white px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-3xl">

        {/* Header */}
        <div className="relative flex items-center justify-center mb-10">
          <button
            onClick={() => navigate('/')}
            className="absolute left-0 pixel-button-primary"
          >
            ← BACK
          </button>

          <h2 className="pixel-text text-2xl text-center">MY TRIPS</h2>

          <button
            onClick={() => navigate('/create-trip')}
            className="absolute right-0 pixel-button-primary"
          >
            ⊕ NEW TRIP
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center h-[60vh]">
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
                      className="pixel-card bg-gray-900 p-6 border-2 border-blue-500/20 hover:border-blue-500/40 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="pixel-text text-yellow-400 mb-2">{trip.destination}</h4>
                          <p className="outfit-text text-gray-400">
                            {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteClick(trip.id)}
                          className="text-red-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
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
                      className="pixel-card bg-gray-900/50 p-6 border-2 border-blue-500/10 hover:border-blue-500/20 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="pixel-text text-gray-400 mb-2">{trip.destination}</h4>
                          <p className="outfit-text text-gray-500">
                            {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteClick(trip.id)}
                          className="text-red-500/50 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] w-full">
            <div className="pixel-card w-full max-w-md mx-auto bg-gray-900 text-center border-2 border-blue-500/20 px-6 py-10 rounded">
              <MapPin className="w-10 h-10 text-blue-500 mb-4 mx-auto" />
              <h3 className="pixel-text text-lg text-white mb-2">
                START YOUR FIRST ADVENTURE
              </h3>
              <p className="outfit-text text-gray-400">
                Create your first trip and begin your journey!
              </p>
              <button
                onClick={() => navigate('/create-trip')}
                className="pixel-button-primary mt-6"
              >
                CREATE FIRST TRIP
              </button>
            </div>
          </div>
        )}

        <DeleteModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="DELETE TRIP"
          message="Are you sure you want to delete this trip? This action cannot be undone."
        />
      </div>
    </div>
  );
};

export default MyTripsPage;
