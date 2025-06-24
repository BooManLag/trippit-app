import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, ExternalLink, Loader2 } from 'lucide-react';
import PostReactions from './PostReactions';
import { reactionService } from '../services/reactionService';

interface SharedItineraryCardProps {
  postId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  postUrl: string;
  className?: string;
}

const SharedItineraryCard: React.FC<SharedItineraryCardProps> = ({
  postId,
  title,
  destination,
  startDate,
  endDate,
  totalDays,
  postUrl,
  className = ''
}) => {
  const [loading, setLoading] = useState(true);
  const [reactionCounts, setReactionCounts] = useState<any>(null);

  useEffect(() => {
    const fetchReactions = async () => {
      try {
        setLoading(true);
        const counts = await reactionService.getReactionCounts(postId);
        setReactionCounts(counts);
      } catch (error) {
        console.error('Error fetching reactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReactions();

    // Subscribe to reaction changes
    const unsubscribe = reactionService.subscribeToReactions(postId, (newCounts) => {
      setReactionCounts(newCounts);
    });

    return () => {
      unsubscribe();
    };
  }, [postId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className={`pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-purple-500/20 hover:border-purple-500/40 transition-all ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="pixel-text text-purple-400 text-sm sm:text-base mb-2 break-words">
            {title}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="outfit-text text-gray-300 text-sm break-words">
              {destination}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="outfit-text text-gray-400 text-xs">
              {formatDate(startDate)} - {formatDate(endDate)} • {totalDays} days
            </span>
          </div>
        </div>
        
        <a 
          href={postUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="pixel-button-secondary text-xs px-3 py-1 flex items-center gap-1 flex-shrink-0 bg-gray-700 hover:bg-gray-600"
        >
          <ExternalLink className="w-3 h-3" />
          VIEW ON REDDIT
        </a>
      </div>

      <div className="border-t border-gray-700 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin mr-2" />
            <span className="outfit-text text-gray-400 text-xs">Loading reactions...</span>
          </div>
        ) : (
          <PostReactions 
            postId={postId} 
            initialCounts={reactionCounts}
            size="sm"
          />
        )}
      </div>
    </div>
  );
};

export default SharedItineraryCard;