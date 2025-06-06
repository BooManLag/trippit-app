import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isAuthenticated } from '../lib/supabase';
import { MapPin, Loader2, PlusCircle, Trash2, Play, Calendar, Star } from 'lucide-react';
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
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
  }, []);

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

  const getStatusIcon = (status: Trip['status']) => {
    switch (status) {
      case 'in_progress':
        return '🔥';
      case 'completed':
        return '🏆';
      default:
        return '⏳';
    }
  };

  return (
    <div className="min-h-screen w-full mobile-padding py-6 sm:py-8 lg:py-12 bg-black text-white flex justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-2 h-2 bg-blue-500 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-yellow-400 rounded-full animate-ping opacity-40"></div>
        <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce opacity-50"></div>
        <div className="absolute top-1/2 right-10 w-1 h-1 bg-green-400 rounded-full animate-pulse opacity-30"></div>
        <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-pink-500 rounded-full animate-ping opacity-40"></div>
      </div>

      <div className="w-full max-w-6xl relative z-10">
        {/* Header */}
        <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 lg:mb-12 gap-4 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="flex items-center gap-4">
            <BackButton to="/" />
            <div>
              <h2 className="pixel-text mobile-heading text-blue-400 glow-text">MY ADVENTURES</h2>
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base">Your travel journey awaits</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/create-trip')}
            className="pixel-button-primary flex items-center justify-center gap-2 w-full sm:w-auto hover-float"
          >
            <PlusCircle className="w-4 sm:w-5 h-4 sm:h-5" />
            NEW ADVENTURE
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-[60vh]">
            <div className="animate-bounce-in">
              <Loader2 className="w-8 sm:w-12 h-8 sm:h-12 text-blue-500 animate-spin" />
              <p className="pixel-text text-blue-400 mt-4 text-sm sm:text-base">LOADING ADVENTURES...</p>
            </div>
          </div>
        ) : trips.length > 0 ? (
          <div className="space-y-6 sm:space-y-8 lg:space-y-12">
            {upcoming.length > 0 && (
              <section className={`animate-slide-in-up delay-200`}>
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="text-2xl sm:text-3xl animate-float">🛫</div>
                  <h3 className="pixel-text text-blue-400 text-sm sm:text-base lg:text-lg">UPCOMING ADVENTURES</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {upcoming.map((trip, index) => (
                    <div
                      key={trip.id}
                      className={`pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-blue-500/30 hover:border-blue-500/60 transition-all duration-300 group animate-slide-in-left`}
                      style={{ animationDelay: `${index * 100 + 300}ms` }}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-blue-400 flex-shrink-0" />
                            <h4 className="pixel-text text-yellow-400 text-sm sm:text-base break-words group-hover:text-yellow-300 transition-colors">
                              {trip.destination}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <p className="outfit-text text-gray-400 text-sm sm:text-base">
                              {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getStatusIcon(trip.status)}</span>
                            <p className={`pixel-text text-xs sm:text-sm ${getStatusColor(trip.status)}`}>
                              {getStatusText(trip.status)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 justify-end sm:justify-start flex-shrink-0">
                          <button
                            onClick={() => handlePlayTrip(trip.id)}
                            className="text-green-500 hover:text-green-400 transition-all duration-300 p-2 hover:scale-110 hover-glow"
                            title="View trip dashboard"
                          >
                            {trip.status === 'in_progress' ? (
                              <Play className="w-5 sm:w-6 h-5 sm:h-6 fill-current" />
                            ) : (
                              <Play className="w-5 sm:w-6 h-5 sm:h-6" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteClick(trip.id)}
                            className="text-red-500 hover:text-red-400 transition-all duration-300 p-2 hover:scale-110 hover-wiggle"
                            title="Delete trip"
                          >
                            <Trash2 className="w-5 sm:w-6 h-5 sm:h-6" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section className={`animate-slide-in-up delay-400`}>
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="text-2xl sm:text-3xl animate-float delay-500">🗂️</div>
                  <h3 className="pixel-text text-blue-400 text-sm sm:text-base lg:text-lg">COMPLETED ADVENTURES</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {past.map((trip, index) => (
                    <div
                      key={trip.id}
                      className={`pixel-card bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-2 border-blue-500/10 hover:border-blue-500/30 transition-all duration-300 group animate-slide-in-right`}
                      style={{ animationDelay: `${index * 100 + 600}ms` }}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-gray-500 flex-shrink-0" />
                            <h4 className="pixel-text text-gray-400 text-sm sm:text-base break-words group-hover:text-gray-300 transition-colors">
                              {trip.destination}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <p className="outfit-text text-gray-500 text-sm sm:text-base">
                              {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <p className="pixel-text text-xs sm:text-sm text-blue-400">
                              ADVENTURE COMPLETED
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteClick(trip.id)}
                          className="text-red-500/50 hover:text-red-400 transition-all duration-300 p-2 self-end sm:self-start hover:scale-110 hover-wiggle flex-shrink-0"
                          title="Delete trip"
                        >
                          <Trash2 className="w-5 sm:w-6 h-5 sm:h-6" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center h-[60vh] pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-blue-500/30 text-center p-6 sm:p-8 lg:p-12 animate-bounce-in delay-300`}>
            <div className="text-6xl sm:text-8xl mb-6 animate-float">🗺️</div>
            <h3 className="pixel-text mobile-heading text-gray-300 mb-4 glow-text">START YOUR FIRST ADVENTURE</h3>
            <p className="outfit-text text-gray-500 mb-6 sm:mb-8 text-sm sm:text-base lg:text-lg max-w-md">
              Every great journey begins with a single step. Create your first trip and begin your epic adventure!
            </p>
            <button
              onClick={() => navigate('/create-trip')}
              className="pixel-button-primary w-full sm:w-auto hover-float animate-pulse-glow"
            >
              CREATE FIRST ADVENTURE
            </button>
          </div>
        )}

        <DeleteModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="DELETE ADVENTURE"
          message="Are you sure you want to delete this adventure? This action cannot be undone and all associated data will be lost."
        />
      </div>
    </div>
  );
};

export default MyTripsPage;