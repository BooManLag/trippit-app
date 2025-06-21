import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Star, Award, Target, Crown, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AuthStatus } from '../components/AuthStatus';
import { badgeService, Badge, UserBadge, BadgeProgress } from '../services/badgeService';
import BadgeModal from '../components/BadgeModal';

const BadgesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');
  const { user } = useAuth();
  
  const [trip, setTrip] = useState<any>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [badgeProgress, setBadgeProgress] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [showModal, setShowModal] = useState(false);

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

        // Fetch all data
        const [allBadges, earnedBadges, progress] = await Promise.all([
          badgeService.getAllBadges(),
          badgeService.getUserBadges(user.id, tripId || undefined),
          badgeService.getBadgeProgress(user.id, tripId || undefined)
        ]);

        setBadges(allBadges);
        setUserBadges(earnedBadges);
        setBadgeProgress(progress);

      } catch (error) {
        console.error('Error fetching badge data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, tripId, navigate]);

  const getBadgeStatus = (badge: Badge) => {
    const earned = userBadges.find(ub => ub.badge_id === badge.id);
    if (earned) return { type: 'earned' as const, data: earned };

    const progress = badgeProgress.find(bp => bp.badge_key === badge.badge_key);
    if (progress) return { type: 'progress' as const, data: progress };

    return { type: 'locked' as const, data: null };
  };

  const handleBadgeClick = (badge: Badge) => {
    setSelectedBadge(badge);
    setShowModal(true);
  };

  const getSelectedBadgeData = () => {
    if (!selectedBadge) return {};
    
    const status = getBadgeStatus(selectedBadge);
    return {
      userBadge: status.type === 'earned' ? status.data : undefined,
      progress: status.type === 'progress' ? status.data.current_count : 0,
      maxProgress: status.type === 'progress' ? status.data.target_count : selectedBadge.requirement_value
    };
  };

  // Group badges by category
  const badgesByCategory = badges.reduce((acc, badge) => {
    if (!acc[badge.category]) {
      acc[badge.category] = [];
    }
    acc[badge.category].push(badge);
    return acc;
  }, {} as Record<string, Badge[]>);

  const categories = Object.keys(badgesByCategory);
  const earnedCount = userBadges.length;
  const totalCount = badges.length;

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

        {/* Progress Summary */}
        <div className={`pixel-card bg-gradient-to-br from-yellow-900/20 to-orange-900/20 mb-6 sm:mb-8 border-2 border-yellow-500/30 animate-slide-in-up delay-200`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-yellow-400 animate-pulse" />
              <h3 className="pixel-text text-yellow-400 text-sm sm:text-base lg:text-lg glow-text">
                ACHIEVEMENT PROGRESS
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="pixel-text text-yellow-400 text-lg sm:text-xl">
                  {earnedCount}
                </div>
                <div className="pixel-text text-xs text-gray-400">EARNED</div>
              </div>
              <div className="text-center">
                <div className="pixel-text text-orange-400 text-lg sm:text-xl">
                  {totalCount}
                </div>
                <div className="pixel-text text-xs text-gray-400">TOTAL</div>
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-700 h-4 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 h-full transition-all duration-500 flex items-center justify-center"
              style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
            >
              {earnedCount > 0 && (
                <span className="pixel-text text-xs text-black font-bold">
                  {Math.round((earnedCount / totalCount) * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 sm:py-16">
            <div className="animate-bounce-in">
              <Loader2 className="w-8 sm:w-12 h-8 sm:h-12 text-yellow-500 animate-spin mr-3" />
              <span className="pixel-text text-yellow-400 text-sm sm:text-base">LOADING ACHIEVEMENTS...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-12">
            {categories.map((category, categoryIndex) => (
              <div 
                key={category}
                className={`animate-slide-in-up`}
                style={{ animationDelay: `${categoryIndex * 100 + 300}ms` }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <Target className="w-6 h-6 text-blue-400" />
                  <h3 className="pixel-text text-blue-400 text-sm sm:text-base lg:text-lg glow-text">
                    {category.toUpperCase()}
                  </h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-transparent"></div>
                  <span className="pixel-text text-xs text-blue-400">
                    {userBadges.filter(ub => ub.badge.category === category).length}/{badgesByCategory[category].length}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
                  {badgesByCategory[category].map((badge, badgeIndex) => {
                    const status = getBadgeStatus(badge);
                    const isEarned = status.type === 'earned';
                    const hasProgress = status.type === 'progress';
                    
                    return (
                      <div 
                        key={badge.id}
                        className={`flex flex-col items-center cursor-pointer group animate-slide-in-up`}
                        style={{ animationDelay: `${categoryIndex * 100 + badgeIndex * 50 + 400}ms` }}
                        onClick={() => handleBadgeClick(badge)}
                      >
                        <div className="relative">
                          <div 
                            className={`
                              w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 border-4
                              ${isEarned 
                                ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-lg shadow-yellow-500/30 border-yellow-300 group-hover:scale-110' 
                                : 'bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 shadow-lg shadow-gray-700/30 border-gray-500 group-hover:scale-105'
                              }
                            `}
                          >
                            <span 
                              className={`
                                text-2xl sm:text-3xl transition-all duration-300
                                ${isEarned ? 'grayscale-0' : 'grayscale opacity-50'}
                                group-hover:scale-110
                              `}
                            >
                              {badge.emoji}
                            </span>
                          </div>

                          {/* Progress Ring for badges with progress */}
                          {!isEarned && hasProgress && status.data && (
                            <div className="absolute inset-0">
                              <svg 
                                className="w-16 h-16 sm:w-20 sm:h-20 transform -rotate-90"
                                viewBox="0 0 100 100"
                              >
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="45"
                                  fill="none"
                                  stroke="rgba(59, 130, 246, 0.2)"
                                  strokeWidth="8"
                                />
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="45"
                                  fill="none"
                                  stroke="rgb(59, 130, 246)"
                                  strokeWidth="8"
                                  strokeDasharray={`${(status.data.current_count / status.data.target_count) * 283} 283`}
                                  strokeLinecap="round"
                                  className="transition-all duration-500"
                                />
                              </svg>
                            </div>
                          )}

                          {/* Glow effect for earned badges */}
                          {isEarned && (
                            <div className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 opacity-20 animate-pulse blur-sm" />
                          )}
                        </div>

                        {/* Badge Info */}
                        <div className="mt-3 text-center max-w-24">
                          <h4 className={`
                            pixel-text text-xs sm:text-sm
                            ${isEarned ? 'text-yellow-400' : 'text-gray-500'}
                            break-words leading-tight
                          `}>
                            {badge.name}
                          </h4>
                          
                          {hasProgress && status.data && !isEarned && (
                            <div className="outfit-text text-xs text-gray-400 mt-1">
                              {status.data.current_count}/{status.data.target_count}
                            </div>
                          )}

                          {isEarned && (
                            <div className="outfit-text text-xs text-yellow-300 mt-1">
                              <Star className="w-3 h-3 inline mr-1" />
                              EARNED
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && badges.length === 0 && (
          <div className="text-center py-12 animate-bounce-in delay-500">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="pixel-text text-xl text-yellow-400 mb-4">NO BADGES YET</h3>
            <p className="outfit-text text-gray-500 mb-6">
              Complete activities to earn your first badge!
            </p>
          </div>
        )}

        {/* Badge Modal */}
        {selectedBadge && (
          <BadgeModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            badge={selectedBadge}
            {...getSelectedBadgeData()}
          />
        )}

        {/* Motivational Footer */}
        <div className={`text-center mt-8 sm:mt-12 animate-slide-in-up delay-600`}>
          <div className="pixel-card bg-gray-900/30 border border-gray-700">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Star className="w-5 h-5 text-yellow-400 animate-pulse" />
              <span className="pixel-text text-yellow-400 text-sm">ACHIEVEMENT HUNTER</span>
              <Star className="w-5 h-5 text-yellow-400 animate-pulse" />
            </div>
            <p className="outfit-text text-gray-500 text-sm">
              {earnedCount > 0 
                ? `🎉 You've earned ${earnedCount} badge${earnedCount !== 1 ? 's' : ''}! Keep exploring to unlock more achievements! 🎉`
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