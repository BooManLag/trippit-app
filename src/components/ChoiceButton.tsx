import React from 'react';
import { Choice } from '../types';

interface ChoiceButtonProps {
  choice: Choice;
  onSelect: (choice: Choice) => void;
}

const ChoiceButton: React.FC<ChoiceButtonProps> = ({ choice, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(choice)}
      className="w-full text-left p-4 mb-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <span className="text-lg font-medium">{choice.text}</span>
    </button>
  );
};

export default ChoiceButton;