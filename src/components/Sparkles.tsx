import React, { useState, useEffect } from 'react';

interface SparkleProps {
  color: string;
  size: number;
  style: React.CSSProperties;
}

const Sparkle: React.FC<SparkleProps> = ({ color, size, style }) => {
  return (
    <div 
      className="absolute rounded-full animate-pulse"
      style={{
        ...style,
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: `0 0 ${size * 2}px ${color}`,
      }}
    />
  );
};

interface SparklesProps {
  count?: number;
  colors?: string[];
  minSize?: number;
  maxSize?: number;
}

const Sparkles: React.FC<SparklesProps> = ({ 
  count = 8, // Much fewer sparkles
  colors = ['#FFD700', '#87CEEB', '#E6E6FA', '#F0F8FF', '#FFFACD'], // Softer, travel-inspired colors
  minSize = 1,
  maxSize = 3 // Much smaller sizes
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
        opacity: Math.random() * 0.4 + 0.2, // Much more subtle opacity
        animationDuration: `${Math.random() * 4 + 3}s`, // Slower, more gentle pulsing
        animationDelay: `${Math.random() * 3}s`,
        zIndex: 10
      }
    }));
    
    setSparkles(initialSparkles);
    
    // Very slow, gentle updates - like distant city lights
    const interval = setInterval(() => {
      setSparkles(prev => 
        prev.map(sparkle => ({
          ...sparkle,
          style: {
            ...sparkle.style,
            opacity: Math.random() * 0.4 + 0.2, // Gentle fade in/out
          }
        }))
      );
    }, 8000); // Much slower updates
    
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