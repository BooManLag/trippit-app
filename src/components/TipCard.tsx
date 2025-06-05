import React from 'react';
import { Tip } from '../types';
import { ExternalLink, MessageSquare, ThumbsUp } from 'lucide-react';

interface TipCardProps {
  tip: Tip;
}

const TipCard: React.FC<TipCardProps> = ({ tip }) => {
  return (
    <div className="pixel-card bg-gray-900 p-4 border-2 border-blue-500/20 hover:border-blue-500/40 transition-all">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="pixel-text text-xs text-blue-400">{tip.subreddit}</span>
            {tip.score > 100 && (
              <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1">
                HOT 🔥
              </span>
            )}
          </div>
          
          <h3 className="outfit-text font-bold text-white mb-2 line-clamp-2">
            {tip.title}
          </h3>
          
          <p className="outfit-text text-gray-400 text-sm line-clamp-3 mb-4">
            {tip.content}
          </p>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-blue-400">
                <ThumbsUp className="w-4 h-4" />
                {tip.score}
              </span>
              <span className="flex items-center gap-1 text-gray-400">
                <MessageSquare className="w-4 h-4" />
                {tip.numComments || 0}
              </span>
            </div>
            
            <a
              href={tip.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              <span className="text-xs">READ MORE</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TipCard;