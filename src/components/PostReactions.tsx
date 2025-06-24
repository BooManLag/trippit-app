import React, { useState, useEffect } from 'react';
import { Star, Poop, Loader2 } from 'lucide-react';
import { reactionService, ReactionCounts } from '../services/reactionService';
import { useAuth } from '../hooks/useAuth';
import AuthModal from './AuthModal';

interface PostReactionsProps {
  postId: string;
  initialCounts?: ReactionCounts;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const PostReactions: React.FC<PostReactionsProps> = ({
  postId,
  initialCounts,
  className = '',
  size = 'md'
}) => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<ReactionCounts>(initialCounts || {
    starsCount: 0,
    shitsCount: 0,
    totalCount: 0,
    starPercentage: 0,
    shitPercentage: 0,
    userReaction: null
  });
  const [loading, setLoading] = useState(!initialCounts);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingReaction, setPendingReaction] = useState<'star' | 'shit' | null>(null);

  useEffect(() => {
    // Fetch initial counts if not provided
    if (!initialCounts) {
      fetchCounts();
    }

    // Subscribe to reaction changes
    const unsubscribe = reactionService.subscribeToReactions(postId, (newCounts) => {
      setCounts(newCounts);
    });

    return () => {
      unsubscribe();
    };
  }, [postId, initialCounts]);

  const fetchCounts = async () => {
    try {
      setLoading(true);
      const newCounts = await reactionService.getReactionCounts(postId);
      setCounts(newCounts);
    } catch (error) {
      console.error('Error fetching reaction counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (type: 'star' | 'shit') => {
    if (!user) {
      setPendingReaction(type);
      setShowAuthModal(true);
      return;
    }

    try {
      setLoading(true);
      const newCounts = await reactionService.addReaction(postId, type);
      setCounts(newCounts);
    } catch (error) {
      console.error(`Error adding ${type} reaction:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = async () => {
    setShowAuthModal(false);
    if (pendingReaction) {
      await handleReaction(pendingReaction);
      setPendingReaction(null);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: {
      container: 'text-xs',
      button: 'px-2 py-1',
      icon: 'w-3 h-3',
      text: 'text-xs'
    },
    md: {
      container: 'text-sm',
      button: 'px-3 py-1.5',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    lg: {
      container: 'text-base',
      button: 'px-4 py-2',
      icon: 'w-5 h-5',
      text: 'text-base'
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleReaction('star')}
          disabled={loading}
          className={`flex items-center gap-1 ${sizeClasses[size].button} rounded-full transition-all ${
            counts.userReaction === 'star'
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-yellow-500/30 hover:text-yellow-400'
          }`}
        >
          {loading ? (
            <Loader2 className={`${sizeClasses[size].icon} animate-spin`} />
          ) : (
            <Star className={`${sizeClasses[size].icon} ${counts.userReaction === 'star' ? 'fill-yellow-400' : ''}`} />
          )}
          <span className={sizeClasses[size].text}>{counts.starsCount}</span>
        </button>

        <button
          onClick={() => handleReaction('shit')}
          disabled={loading}
          className={`flex items-center gap-1 ${sizeClasses[size].button} rounded-full transition-all ${
            counts.userReaction === 'shit'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-amber-500/30 hover:text-amber-400'
          }`}
        >
          {loading ? (
            <Loader2 className={`${sizeClasses[size].icon} animate-spin`} />
          ) : (
            <Poop className={`${sizeClasses[size].icon} ${counts.userReaction === 'shit' ? 'fill-amber-400' : ''}`} />
          )}
          <span className={sizeClasses[size].text}>{counts.shitsCount}</span>
        </button>
      </div>

      {counts.totalCount > 0 && (
        <div className="mt-2">
          <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-yellow-500 to-amber-500 h-full transition-all duration-500"
              style={{ width: `${counts.starPercentage}%` }}
            />
          </div>
          <div className={`flex justify-between mt-1 ${sizeClasses[size].text} text-gray-400`}>
            <span>{counts.starPercentage}% Star</span>
            <span>{counts.shitPercentage}% Shit</span>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default PostReactions;