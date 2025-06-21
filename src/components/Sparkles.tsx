import React, { useState, useEffect } from 'react';

interface SparkleProps {
  color: string;
  size: number;
  style: React.CSSProperties;
}

const Sparkle: React.FC<SparkleProps> = ({ color, size, style }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 160 160" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      className="absolute animate-pulse"
    >
      <path 
        d="M80 0C80 0 84.2846 41.2925 101.496 58.504C118.707 75.7154 160 80 160 80C160 80 118.707 84.2846 101.496 101.496C84.2846 118.707 80 160 80 160C80 160 75.7154 118.707 58.504 101.496C41.2925 84.2846 0 80 0 80C0 80 41.2925 75.7154 58.504 58.504C75.7154 41.2925 80 0 80 0Z" 
        fill={color}
      />
    </svg>
  );
};

interface SparklesProps {
  count?: number;
  colors?: string[];
  minSize?: number;
  maxSize?: number;
}

const Sparkles: React.FC<SparklesProps> = ({ 
  count = 15, 
  colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#7B68EE', '#FF69B4'],
  minSize = 10,
  maxSize = 20
}) => {
  const [sparkles, setSparkles] = useState<Array<{
    id: number;
    color: string;
    size: number;
    style: React.CSSProperties;
  }>>([]);

  useEffect(() => {
    // Generate initial sparkles
    const initialSparkles = Array.from({ length: count }, (_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * (maxSize - minSize) + minSize,
      style: {
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        opacity: Math.random() * 0.7 + 0.3,
        animationDuration: `${Math.random() * 3 + 1}s`,
        animationDelay: `${Math.random() * 2}s`,
        transform: `rotate(${Math.random() * 360}deg)`,
        zIndex: 10
      }
    }));
    
    setSparkles(initialSparkles);
    
    // Periodically update sparkles
    const interval = setInterval(() => {
      setSparkles(prev => 
        prev.map(sparkle => ({
          ...sparkle,
          style: {
            ...sparkle.style,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.7 + 0.3,
            transform: `rotate(${Math.random() * 360}deg)`,
          }
        }))
      );
    }, 3000);
    
    return () => clearInterval(interval);
  }, [count, colors, minSize, maxSize]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {sparkles.map(sparkle => (
        <Sparkle 
          key={sparkle.id}
          color={sparkle.color}
          size={sparkle.size}
          style={sparkle.style}
        />
      ))}
    </div>
  );
};

export default Sparkles;