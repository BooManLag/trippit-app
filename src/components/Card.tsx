import React from 'react';

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, onClick, className = '' }) => {
  return (
    <div 
      className={`bg-white rounded-lg shadow-md p-4 mb-4 transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-lg transform hover:-translate-y-1' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;