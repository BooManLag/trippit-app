import React from 'react';
import { Tip } from '../types';
import { ShieldAlert, DollarSign, Languages, Lightbulb, Utensils, Bus } from 'lucide-react';

interface TipCardProps {
  tip: Tip;
}

const TipCard: React.FC<TipCardProps> = ({ tip }) => {
  const getCategoryIcon = () => {
    switch (tip.category) {
      case 'Safety':
        return <ShieldAlert className="h-5 w-5 text-red-500" />;
      case 'Budget':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'Language':
        return <Languages className="h-5 w-5 text-blue-500" />;
      case 'Culture':
        return <Lightbulb className="h-5 w-5 text-purple-500" />;
      case 'Food':
        return <Utensils className="h-5 w-5 text-amber-500" />;
      case 'Transport':
        return <Bus className="h-5 w-5 text-teal-500" />;
      default:
        return <Lightbulb className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="pixel-card bg-gray-900 p-4 border-2 border-blue-500/20 hover:border-blue-500/40 transition-all">
      <div className="flex items-start gap-3">
        <div className="mr-3">{getCategoryIcon()}</div>
        <div className="flex-1">
          <h3 className="pixel-text text-sm text-blue-400 mb-2">{tip.category}</h3>
          <p className="outfit-text text-gray-300">{tip.content}</p>
          {tip.location && (
            <div className="mt-2 outfit-text text-sm text-gray-500">
              Location: {tip.location}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TipCard;