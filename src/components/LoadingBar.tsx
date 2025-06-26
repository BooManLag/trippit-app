import React, { useEffect, useState } from 'react';

interface LoadingBarProps {
  isLoading: boolean;
  color?: string;
  height?: number;
  duration?: number;
}

const LoadingBar: React.FC<LoadingBarProps> = ({
  isLoading,
  color = '#3B82F6', // Default blue color
  height = 3,
  duration = 800
}) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    let completeTimeout: NodeJS.Timeout;

    if (isLoading) {
      setVisible(true);
      setProgress(0);

      // Quickly move to 30%
      setTimeout(() => {
        setProgress(30);
      }, 100);

      // Gradually move to 90% (simulating loading)
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 10;
        });
      }, 300);
    } else if (visible) {
      // Complete the progress bar
      setProgress(100);
      
      // Hide the bar after animation completes
      completeTimeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, duration);
    }

    return () => {
      clearInterval(progressInterval);
      clearTimeout(completeTimeout);
    };
  }, [isLoading, duration]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999]">
      <div 
        className="h-[3px] bg-gray-200 dark:bg-gray-800"
        style={{ height: `${height}px` }}
      >
        <div 
          className="h-full transition-all ease-out duration-300"
          style={{ 
            width: `${progress}%`, 
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}`,
            transition: `width ${progress === 100 ? duration / 2 : duration}ms ease-out`
          }}
        />
      </div>
    </div>
  );
};

export default LoadingBar;