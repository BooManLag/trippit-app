import React from 'react';
import { Badge } from '../types';
import { Lock, Unlock } from 'lucide-react';

interface BadgeItemProps {
  badge: Badge;
}

const BadgeItem: React.FC<BadgeItemProps> = ({ badge }) => {
  return (
    <div className="flex items-center p-3 border rounded-lg mb-2 bg-white">
      <div className={`mr-3 ${badge.unlocked ? 'text-blue-500' : 'text-gray-400'}`}>
        {badge.unlocked ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
      </div>
      <div className="flex-1">
        <h3 className={`font-bold ${badge.unlocked ? 'text-gray-800' : 'text-gray-500'}`}>
          {badge.name}
        </h3>
        <p className={`text-sm ${badge.unlocked ? 'text-gray-600' : 'text-gray-400'}`}>
          {badge.description}
        </p>
      </div>
    </div>
  );
};

export default BadgeItem;