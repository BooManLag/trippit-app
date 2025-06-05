import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isAuthenticated } from '../lib/supabase';
import { MapPin, Loader2, PlusCircle, Trash2, Play } from 'lucide-react';
import BackButton from '../components/BackButton';
import DeleteModal from '../components/DeleteModal';

interface Trip {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  status?: 'not_started' | 'in_progress' | 'completed';
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
      // Add status based on dates
      const tripsWithStatus = (data || []).map(trip => {
        const startDate = new Date(trip.start_date);
        const endDate = new Date(trip.end_date);
        const today = new Date();

        let status: Trip['status'] = 'not_started';
        if (today > endDate) {
          status = 'completed';
        } else if (today >= startDate && today <= endDate) {
          status = 'in_progress';
        }

        return { ...trip, status };
      });
      setTrips(tripsWithStatus);
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

  const handlePlayTrip = (tripId: string) => {
    navigate(`/trip/${tripId}`);
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

  const getStatusColor = (status: Trip['status']) => {
    switch (status) {
      case 'in_progress':
        return 'text-green-400';
      case 'completed':
        return 'text-blue-400';
      default:
        return 'text-yellow-400';
    }
  };

  const getStatusText = (status: Trip['status']) => {
    switch (status) {
      case 'in_progress':
        return 'IN PROGRESS';
      case 'completed':
        return 'COMPLETED';
      default:
        return 'NOT STARTED';
    }
  };

  return (
    <div className="min-h-screen w-full px-4 py-12 bg-black text-white flex justify-center">
      <div className="w-full max-w-3xl">
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
                          <p className={`outfit-text text-sm mt-2 ${getStatusColor(trip.status)}`}>
                            {getStatusText(trip.status)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handlePlayTrip(trip.id)}
                            className="text-green-500 hover:text-green-400 transition-colors"
                          >
                            {trip.status === 'in_progress' ? (
                              <Play className="w-5 h-5 fill-current" />
                            ) : (
                              <Play className="w-5 h-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteClick(trip.id)}
                            className="text-red-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
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
                          <p className="outfit-text text-sm mt-2 text-blue-400">
                            COMPLETED
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
          <div className="flex flex-col items-center justify-center h-[60vh] bg-gray-900 border-2 border-blue-500/20 rounded text-center px-6">
            <MapPin className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="pixel-text text-lg text-gray-300 mb-2">START YOUR FIRST ADVENTURE</h3>
            <p className="outfit-text text-gray-500 mb-6">Create your first trip and begin your journey!</p>
            <button
              onClick={() => navigate('/create-trip')}
              className="pixel-button-primary"
            >
              CREATE FIRST TRIP
            </button>
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