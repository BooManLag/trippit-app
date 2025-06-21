import React from 'react';
import { X } from 'lucide-react';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="pixel-card max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-400 hover:text-white"
        >
          <X className="w-4 sm:w-5 h-4 sm:h-5" />
        </button>

        <div className="text-center mb-6 sm:mb-8">
          <h2 className="pixel-text text-lg sm:text-2xl mb-4 text-red-500">{title}</h2>
          <p className="outfit-text text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base break-words">{message}</p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onClose}
              className="pixel-button-secondary bg-gray-600 hover:bg-gray-500 flex-1"
            >
              CANCEL
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="pixel-button-primary bg-red-500 hover:bg-red-600 flex-1"
            >
              DELETE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;