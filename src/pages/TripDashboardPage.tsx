import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Gamepad2, MapPin, CheckSquare, Calendar, Trophy, Lightbulb, ChevronRight, Star, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';
import TipCard from '../components/TipCard';
import { ChecklistItem, Tip } from '../types';
import { defaultChecklist } from '../data/defaultChecklist';

interface TripDetails {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
}

interface BucketListGoal {
  id: string;
  title: string;
  completed: boolean;
}

const TripDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [tripCount, setTripCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadingTips, setLoadingTips] = useState(true);
  const [tips, setTips] = useState<Tip[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [bucketListGoals, setBucketListGoals] = useState<BucketListGoal[]>([
    { id: '1', title: 'Visit the main attractions', completed: false },
    { id: '2', title: 'Try local cuisine', completed: false },
    { id: '3', title: 'Take iconic photos', completed: false },
    { id: '4', title: 'Learn basic phrases', completed: false }
  ]);

  const fetchRedditTips = async (city: string, country: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-reddit-tips`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ city, country }),
        }
      );

      if (!response.ok) throw new Error('Failed to fetch tips');

      const tips = await response.json();
      setTips(tips);
    } catch (error) {
      console.error('Error fetching Reddit tips:', error);
    } finally {
      setLoadingTips(false);
    }
  };

  useEffect(() => {
    const fetchTripDetails = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }

        const { data: tripData } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single();

        if (tripData) {
          setTrip(tripData);
          const [city, country] = tripData.destination.split(', ');
          fetchRedditTips(city, country);
        }

        const { data: existingItems } = await supabase
          .from('checklist_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('trip_id', tripId);

        if (existingItems) {
          setChecklistItems(existingItems);
        }

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

  const toggleBucketListGoal = (id: string) => {
    setBucketListGoals(goals =>
      goals.map(goal =>
        goal.id === id ? { ...goal, completed: !goal.completed } : goal
      )
    );
  };

  const getChecklistSummary = () => {
    const totalTasks = checklistItems.length;
    const completedTasks = checklistItems.filter(item => item.is_completed).length;
    const remainingTasks = totalTasks - completedTasks;
    return { totalTasks, completedTasks, remainingTasks };
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full px-4 py-12 bg-black text-white flex justify-center items-center">
        <div className="pixel-text">LOADING...</div>
      </div>
    );
  }

  const { totalTasks, completedTasks, remainingTasks } = getChecklistSummary();

  return (
    <div className="min-h-screen w-full px-4 py-12 bg-black text-white flex justify-center">
      <div className="w-full max-w-5xl">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="pixel-card bg-gray-900 p-6 border-2 border-blue-500/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-6 w-6 text-green-500" />
                <h3 className="pixel-text text-lg">CHECKLIST</h3>
              </div>
              <button 
                onClick={() => navigate(`/checklist?tripId=${tripId}`)}
                className="pixel-text text-sm text-blue-400 hover:text-blue-300"
              >
                VIEW ALL
              </button>
            </div>

            <div className="text-center p-4 bg-gray-800 border border-blue-500/10 mb-6">
              <div className="pixel-text text-4xl text-yellow-400 mb-2">
                {remainingTasks}
              </div>
              <p className="outfit-text text-gray-300">Tasks remaining</p>
              <div className="mt-3 outfit-text text-sm text-gray-400">
                {completedTasks} of {totalTasks} completed
              </div>
              <div className="w-full bg-gray-700 h-2 mt-2 rounded-full overflow-hidden">
                <div 
                  className="bg-green-500 h-full transition-all duration-300"
                  style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pixel-card bg-gray-900 p-6 border-2 border-blue-500/20">
            <div className="flex items-center gap-3 mb-6">
              <Gamepad2 className="h-6 w-6 text-yellow-500" />
              <h3 className="pixel-text text-lg">WHERE'D I GO?</h3>
            </div>
            <p className="outfit-text text-gray-400 mb-6">
              Practice handling travel scenarios and learn from experienced travelers!
            </p>
            <button
              onClick={() => navigate(`/game?tripId=${tripId}`)}
              className="pixel-button-primary w-full flex items-center justify-center gap-2"
            >
              <Gamepad2 className="w-5 h-5" />
              PLAY GAME
            </button>
          </div>
        </div>

        <div className="pixel-card bg-gray-900 p-6 mb-8 border-2 border-blue-500/20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Lightbulb className="h-6 w-6 text-yellow-400" />
              <h3 className="pixel-text text-lg">REDDIT TIPS</h3>
            </div>
            <button 
              onClick={() => navigate(`/tips?tripId=${tripId}`)}
              className="flex items-center text-blue-400 hover:text-blue-300 outfit-text text-sm"
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          {loadingTips ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : tips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tips.slice(0, 4).map(tip => (
                <TipCard key={tip.id} tip={tip} />
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-gray-800 border border-blue-500/10">
              <p className="outfit-text text-gray-400">No tips found for this destination yet.</p>
            </div>
          )}
        </div>

        <div className="pixel-card bg-gray-900 p-6 border-2 border-blue-500/20">
          <div className="flex items-center gap-3 mb-6">
            <Star className="h-6 w-6 text-yellow-400" />
            <h3 className="pixel-text text-lg">BUCKET LIST GOALS</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bucketListGoals.map(goal => (
              <button
                key={goal.id}
                onClick={() => toggleBucketListGoal(goal.id)}
                className={`p-4 border ${
                  goal.completed 
                    ? 'bg-green-500/10 border-green-500/20' 
                    : 'bg-gray-800 border-blue-500/20'
                } hover:border-blue-500/40 transition-colors`}
              >
                <div className="flex items-center">
                  <div className={`w-5 h-5 border-2 ${
                    goal.completed ? 'bg-green-500 border-green-500' : 'border-gray-500'
                  } mr-3`} />
                  <span className={`outfit-text text-left ${
                    goal.completed ? 'text-gray-400 line-through' : 'text-white'
                  }`}>
                    {goal.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripDashboardPage;