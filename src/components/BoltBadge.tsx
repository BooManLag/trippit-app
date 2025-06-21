import React, { useEffect, useState } from 'react';

interface BoltBadgeProps {
  className?: string;
}

const BoltBadge: React.FC<BoltBadgeProps> = ({ className = '' }) => {
  const [rotation, setRotation] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => (prev + 1) % 360);
    }, 50);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <a 
      href="https://bolt.new/" 
      target="_blank" 
      rel="noopener noreferrer"
      className={`fixed top-4 right-4 z-50 transition-all duration-300 hover:scale-110 ${className}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <img 
        src="/white_circle_360x360.png" 
        alt="Powered by Bolt" 
        className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24"
      />
    </a>
  );
};

export default BoltBadge;