import React from 'react';
import { BucketListItem as BucketListItemType } from '../types';
import { CheckCircle, Circle } from 'lucide-react';

interface BucketListItemProps {
  item: BucketListItemType;
  onToggle: (id: string, completed: boolean) => void;
}

const BucketListItem: React.FC<BucketListItemProps> = ({ item, onToggle }) => {
  return (
    <div className="flex items-center p-3 border rounded-lg mb-2 bg-white">
      <button 
        onClick={() => onToggle(item.id, !item.completed)}
        className="mr-3 focus:outline-none"
      >
        {item.completed ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <Circle className="h-5 w-5 text-gray-400" />
        )}
      </button>
      <div className="flex-1">
        <p className={item.completed ? 'text-gray-500 line-through' : 'text-gray-800'}>
          {item.description}
        </p>
        {item.location && (
          <span className="text-xs text-blue-500">{item.location}</span>
        )}
      </div>
    </div>
  );
};

export default BucketListItem;