import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  to?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ to }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="pixel-button-secondary flex items-center gap-2"
    >
      <ArrowLeft className="w-4 h-4" />
      BACK
    </button>
  );
};

export default BackButton;