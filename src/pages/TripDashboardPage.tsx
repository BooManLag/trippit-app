import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Gamepad2, MapPin, CheckSquare, Calendar, Trophy, Lightbulb, ChevronRight, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';
import { mockTips } from '../data/mockData';
import TipCard from '../components/TipCard';
import { ChecklistItem } from '../types';
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
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [bucketListGoals, setBucketListGoals] = useState<BucketListGoal[]>([
    { id: '1', title: 'Visit the main attractions', completed: false },
    { id: '2', title: 'Try local cuisine', completed: false },
    { id: '3', title: 'Take iconic photos', completed: false },
    { id: '4', title: 'Learn basic phrases', completed: false }
  ]);

  const fetchChecklistItems = async (userId: string) => {
    const { data: items, error } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('user_id', userId)
      .eq('trip_id', tripId);
    
    if (error) {
      console.error('Error fetching checklist items:', error);
      return;
    }
    
    if (items) {
      setChecklistItems(items);
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
        }

        const allDefaultItems = defaultChecklist.flatMap(category => 
          category.items.map(item => ({
            id: crypto.randomUUID(),
            description: item.description,
            category: category.name,
            trip_id: tripId,
            user_id: user.id,
            is_completed: false,
            is_default: true
          }))
        );

        const { data: existingItems } = await supabase
          .from('checklist_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('trip_id', tripId);

        if (!existingItems || existingItems.length === 0) {
          const { data: insertedItems, error: insertError } = await supabase
            .from('checklist_items')
            .insert(allDefaultItems)
            .select();

          if (insertError) {
            console.error('Error inserting checklist items:', insertError);
            return;
          }

          if (insertedItems) {
            setChecklistItems(insertedItems);
          }
        } else {
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

  const toggleChecklistItem = async (itemId: string) => {
    const item = checklistItems.find(i => i.id === itemId);
    if (!item) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setChecklistItems(items =>
      items.map(i => i.id === itemId ? { ...i, is_completed: !i.is_completed } : i)
    );

    const { error } = await supabase
      .from('checklist_items')
      .update({ is_completed: !item.is_completed })
      .eq('id', itemId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating checklist item:', error);
      setChecklistItems(items =>
        items.map(i => i.id === itemId ? { ...i, is_completed: item.is_completed } : i)
      );
      return;
    }

    await fetchChecklistItems(user.id);
  };

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

  const getRelevantTips = () => {
    if (!trip) return [];
    const [city, country] = trip.destination.split(', ');
    return mockTips
      .filter(tip => 
        tip.location === 'Global' || 
        tip.location === country || 
        tip.location?.includes(city)
      )
      .slice(0, 3);
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
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {checklistItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 bg-gray-800 p-3 border border-blue-500/10"
                >
                  <button
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`w-4 h-4 border ${
                      item.is_completed
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-500'
                    }`}
                  />
                  <span className={`outfit-text text-sm ${
                    item.is_completed
                      ? 'text-gray-500 line-through'
                      : 'text-gray-300'
                  }`}>
                    {item.description}
                  </span>
                </div>
              ))}
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
              <h3 className="pixel-text text-lg">CITY TIPS</h3>
            </div>
            <button 
              onClick={() => navigate(`/tips?tripId=${tripId}`)}
              className="flex items-center text-blue-400 hover:text-blue-300 outfit-text text-sm"
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getRelevantTips().map(tip => (
              <TipCard key={tip.id} tip={tip} />
            ))}
          </div>
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