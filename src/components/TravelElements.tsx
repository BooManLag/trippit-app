import React, { useState, useEffect } from 'react';

interface TravelElementProps {
  icon: string;
  size: number;
  style: React.CSSProperties;
  animationType: 'float' | 'fly' | 'pulse' | 'drift';
}

const TravelElement: React.FC<TravelElementProps> = ({ icon, size, style, animationType }) => {
  const getAnimation = () => {
    switch (animationType) {
      case 'float':
        return 'animate-float';
      case 'fly':
        return 'animate-fly';
      case 'pulse':
        return 'animate-pulse';
      case 'drift':
        return 'animate-drift';
      default:
        return 'animate-float';
    }
  };

  return (
    <div 
      className={`absolute text-${size} ${getAnimation()}`}
      style={{
        ...style,
        fontSize: `${size}px`,
        opacity: 0.6,
        filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))',
      }}
    >
      {icon}
    </div>
  );
};

interface TravelElementsProps {
  count?: number;
  icons?: string[];
}

const TravelElements: React.FC<TravelElementsProps> = ({ 
  count = 12,
  icons = ['✈️', '🗺️', '🧳', '🎒', '🏔️', '🏖️', '🌍', '📸', '🚂', '🛫', '🗽', '🎡']
}) => {
  const [elements, setElements] = useState<Array<{
    id: number;
    icon: string;
    size: number;
    style: React.CSSProperties;
    animationType: 'float' | 'fly' | 'pulse' | 'drift';
  }>>([]);

  useEffect(() => {
    // Generate initial travel elements
    const initialElements = Array.from({ length: count }, (_, i) => ({
      id: i,
      icon: icons[Math.floor(Math.random() * icons.length)],
      size: Math.random() * 8 + 16, // 16-24px
      style: {
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        animationDuration: `${Math.random() * 6 + 4}s`, // 4-10s
        animationDelay: `${Math.random() * 5}s`,
        zIndex: 10
      },
      animationType: (['float', 'fly', 'pulse', 'drift'] as const)[Math.floor(Math.random() * 4)]
    }));
    
    setElements(initialElements);
    
    // Gentle updates - like distant travel memories
    const interval = setInterval(() => {
      setElements(prev => 
        prev.map(element => ({
          ...element,
          style: {
            ...element.style,
            opacity: Math.random() * 0.4 + 0.3, // 0.3-0.7 opacity
          }
        }))
      );
    }, 12000); // Very slow updates
    
    return () => clearInterval(interval);
  }, [count, icons]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {elements.map(element => (
        <TravelElement 
          key={element.id}
          icon={element.icon}
          size={element.size}
          style={element.style}
          animationType={element.animationType}
        />
      ))}
    </div>
  );
};

export default TravelElements;