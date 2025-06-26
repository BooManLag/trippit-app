import React, { useEffect, useState } from 'react';

interface LoadingBarProps {
  text?: string;
  color?: string;
  height?: number;
  width?: string;
  duration?: number;
  className?: string;
}

const LoadingBar: React.FC<LoadingBarProps> = ({
  text = 'LOADING...',
  color = 'blue',
  height = 8,
  width = '100%',
  duration = 2000,
  className = '',
}) => {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        // Slow down as we approach 100%
        const increment = prev < 70 ? 5 : prev < 90 ? 2 : 0.5;
        const newProgress = Math.min(prev + increment, 100);
        
        if (newProgress >= 100) {
          clearInterval(interval);
          setIsComplete(true);
        }
        
        return newProgress;
      });
    }, duration / 40);

    return () => clearInterval(interval);
  }, [duration]);

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
  };

  const colorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="w-full mb-2">
        <div className="relative w-full bg-gray-800 rounded-none overflow-hidden" style={{ height: `${height}px` }}>
          <div 
            className={`absolute top-0 left-0 h-full bg-gradient-to-r ${colorClass} transition-all duration-300`}
            style={{ width: `${progress}%` }}
          >
            {/* Pixel-style loading blocks */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: 10 }).map((_, i) => (
                <div 
                  key={i}
                  className="h-full border-r border-r-white/20"
                  style={{ width: `${100/10}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between w-full">
        <span className="pixel-text text-xs text-gray-400">{Math.round(progress)}%</span>
        <span className="pixel-text text-xs text-gray-400">{text}</span>
      </div>
      {isComplete && (
        <div className="pixel-text text-xs text-green-400 mt-1 animate-pulse">COMPLETE</div>
      )}
    </div>
  );
};

export default LoadingBar;