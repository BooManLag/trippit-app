import React, { useEffect, useState } from 'react';

interface LoadingBarProps {
  isLoading?: boolean;
  text?: string;
  color?: string;
  height?: number;
  width?: string;
  duration?: number;
  className?: string;
}

const LoadingBar: React.FC<LoadingBarProps> = ({
  isLoading = true,
  text = 'LOADING...',
  color = 'blue',
  height = 4,
  width = '100%',
  duration = 2000,
  className = '',
}) => {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      setIsComplete(true);
      return;
    }

    setProgress(0);
    setIsComplete(false);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        // Slow down as we approach 100%
        const increment = prev < 70 ? 5 : prev < 90 ? 2 : 0.5;
        const newProgress = Math.min(prev + increment, 99); // Stop at 99% until complete
        return newProgress;
      });
    }, duration / 40);

    return () => clearInterval(interval);
  }, [isLoading, duration]);

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
  };

  const colorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

  if (!isLoading && isComplete) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 flex flex-col items-center justify-center h-screen bg-black/80 backdrop-blur-sm ${className}`}>
      <div className="w-full max-w-md px-4">
        <div className="relative w-full bg-gray-800 rounded-none overflow-hidden mb-3" style={{ height: `${height}px` }}>
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
        <div className="flex items-center justify-between w-full">
          <span className="pixel-text text-xs text-gray-400">{Math.round(progress)}%</span>
          <span className="pixel-text text-xs text-gray-400">{text}</span>
        </div>
        {isComplete && (
          <div className="pixel-text text-xs text-green-400 mt-1 animate-pulse">COMPLETE</div>
        )}
      </div>
    </div>
  );
};

export default LoadingBar;