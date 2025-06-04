import React from 'react';
import { Tip } from '../types';
import Card from './Card';
import { Lightbulb, DollarSign, ShieldAlert, Languages, Utensils, Bus } from 'lucide-react';

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
    <Card className="swipe-card">
      <div className="flex items-start">
        <div className="mr-3 mt-1">{getCategoryIcon()}</div>
        <div>
          <h3 className="font-bold text-gray-800 mb-1">{tip.category}</h3>
          <p className="text-gray-700">{tip.content}</p>
          {tip.location && (
            <div className="mt-2 text-sm text-gray-500">
              Location: {tip.location}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TipCard;