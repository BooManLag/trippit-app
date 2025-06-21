import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Star, Award, Target, Crown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AuthStatus } from '../components/AuthStatus';
import BadgeGrid from '../components/BadgeGrid';
import { badgeService, UserBadge } from '../services/badgeService';

const BadgesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');
  const { user } = useAuth();
  
  const [trip, setTrip] = useState<any>(null);
  const [recentBadges, setRecentBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        navigate('/');
        return;
      }

      try {
        setLoading(true);

        // Fetch trip details if tripId is provided
        if (tripId) {
          const { data: tripData } = await supabase
            .from('trips')
            .select('*')
            .eq('id', tripId)
            .single();

          if (tripData) {
            setTrip(tripData);
          }
        }

        // Fetch recent badges
        const userBadges = await badgeService.getUserBadges(user.id, tripId || undefined);
        setRecentBadges(userBadges.slice(0, 5));

      } catch (error) {
        console.error('Error fetching badge data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, tripId, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="pixel-text text-xl text-yellow-400 mb-4">SIGN IN REQUIRED</h2>
          <p className="outfit-text text-gray-400 mb-6">Please sign in to view your badges</p>
          <button
            onClick={() => navigate('/')}
            className="pixel-button-primary"
          >
            GO HOME
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white mobile-padding py-6 sm:py-8 lg:py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-2 h-2 bg-yellow-500 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-orange-400 rounded-full animate-ping opacity-40"></div>
        <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce opacity-50"></div>
        <div className="absolute top-1/2 right-10 w-1 h-1 bg-orange-400 rounded-full animate-pulse opacity-30"></div>
        <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-yellow-500 rounded-full animate-ping opacity-40"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className={`flex items-center justify-between mb-6 sm:mb-8 lg:mb-12 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <button 
              onClick={() => tripId ? navigate(`/trip/${tripId}`) : navigate('/my-trips')} 
              className="text-blue-400 hover:text-blue-300 transition-colors hover:scale-110 flex-shrink-0"
            >
              <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-6 sm:w-8 h-6 sm:h-8 text-yellow-400 animate-pulse flex-shrink-0" />
                <h2 className="pixel-text mobile-heading text-yellow-400 glow-text">ACHIEVEMENT BADGES</h2>
                <Award className="w-6 sm:w-8 h-6 sm:h-8 text-orange-400 animate-float flex-shrink-0" />
              </div>
              {trip ? (
                <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base break-words">
                  Your achievements for {trip.destination}
                </p>
              ) : (
                <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base">
                  Your travel achievements across all adventures
                </p>
              )}
            </div>
          </div>
          <AuthStatus className="flex-shrink-0" />
        </div>

        {/* Recent Achievements Highlight */}
        {recentBadges.length > 0 && (
          <div className={`pixel-card bg-gradient-to-br from-yellow-900/20 to-orange-900/20 mb-6 sm:mb-8 border-2 border-yellow-500/30 animate-slide-in-up delay-200`}>
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-6 h-6 text-yellow-400 animate-pulse" />
              <h3 className="pixel-text text-yellow-400 text-sm sm:text-base lg:text-lg glow-text">
                LATEST ACHIEVEMENTS
              </h3>
              <div className="flex-1 h-px bg-gradient-to-r from-yellow-500/50 to-transparent"></div>
              <span className="pixel-text text-xs text-yellow-400">
                {recentBadges.length} recent
              </span>
            </div>
            
            <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-3">
              {recentBadges.map((userBadge, index) => (
                <div 
                  key={userBadge.id}
                  className={`animate-slide-in-up`}
                  style={{ animationDelay: `${index * 100 + 300}ms` }}
                >
                  <div className="relative group">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-lg shadow-yellow-500/30 flex items-center justify-center border-4 border-yellow-300 group-hover:scale-110 transition-transform duration-300">
                      <span className="text-lg sm:text-2xl group-hover:scale-110 transition-transform duration-300">
                        {userBadge.badge.emoji}
                      </span>
                    </div>
                    
                    {/* Glow effect */}
                    <div className="absolute inset-0 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 opacity-20 animate-pulse blur-sm" />
                    
                    {/* Badge name */}
                    <div className="text-center mt-2">
                      <div className="pixel-text text-xs text-yellow-400 break-words leading-tight">
                        {userBadge.badge.name}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Badge Grid */}
        <div className={`animate-slide-in-up delay-400`}>
          {loading ? (
            <div className="flex items-center justify-center py-12 sm:py-16">
              <div className="animate-bounce-in">
                <Trophy className="w-8 sm:w-12 h-8 sm:h-12 text-yellow-500 animate-spin mr-3" />
                <span className="pixel-text text-yellow-400 text-sm sm:text-base">LOADING ACHIEVEMENTS...</span>
              </div>
            </div>
          ) : (
            <BadgeGrid 
              userId={user.id} 
              tripId={tripId || undefined}
              showCategories={true}
              compact={false}
            />
          )}
        </div>

        {/* Motivational Footer */}
        <div className={`text-center mt-8 sm:mt-12 animate-slide-in-up delay-600`}>
          <div className="pixel-card bg-gray-900/30 border border-gray-700">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Star className="w-5 h-5 text-yellow-400 animate-pulse" />
              <span className="pixel-text text-yellow-400 text-sm">ACHIEVEMENT HUNTER</span>
              <Star className="w-5 h-5 text-yellow-400 animate-pulse" />
            </div>
            <p className="outfit-text text-gray-500 text-sm">
              {recentBadges.length > 0 
                ? `🎉 You've earned ${recentBadges.length} badge${recentBadges.length !== 1 ? 's' : ''} recently! Keep exploring to unlock more achievements! 🎉`
                : '✨ Start your adventure to earn your first badge! Complete dares, checklists, and invite friends to unlock achievements! ✨'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BadgesPage;