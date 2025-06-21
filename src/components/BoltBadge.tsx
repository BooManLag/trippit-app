import React from 'react';

interface BoltBadgeProps {
  className?: string;
}

const BoltBadge: React.FC<BoltBadgeProps> = ({ className = '' }) => {
  return (
    <a 
      href="https://bolt.new/" 
      target="_blank" 
      rel="noopener noreferrer"
      className={`absolute top-4 right-4 z-50 transition-all duration-300 hover:scale-110 ${className}`}
    >
      <img 
        src="/white_circle_360x360.png" 
        alt="Powered by Bolt" 
        className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 animate-spin-slow"
      />
    </a>
  );
};

export default BoltBadge;