import React, { useState } from 'react';
import { ChecklistItem } from '../types';
import { Plus, Trash2, Check } from 'lucide-react';

interface ChecklistCategoryProps {
  name: string;
  items: ChecklistItem[];
  onToggleItem: (id: string) => void;
  onAddItem: (category: string, description: string) => void;
  onDeleteItem: (id: string) => void;
}

const ChecklistCategory: React.FC<ChecklistCategoryProps> = ({
  name,
  items,
  onToggleItem,
  onAddItem,
  onDeleteItem
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newItemText, setNewItemText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemText.trim()) {
      onAddItem(name, newItemText.trim());
      setNewItemText('');
      setIsAdding(false);
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-xl font-bold mb-3">{name}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm group"
          >
            <div className="flex items-center flex-1">
              <button
                onClick={() => onToggleItem(item.id)}
                className={`flex items-center justify-center w-5 h-5 rounded border mr-3 transition-colors ${
                  item.is_completed
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300 hover:border-green-500'
                }`}
              >
                {item.is_completed && <Check className="w-4 h-4 text-white" />}
              </button>
              <span className={item.is_completed ? 'text-gray-500 line-through' : 'text-gray-800'}>
                {item.description}
              </span>
            </div>
            {!item.is_default && (
              <button
                onClick={() => onDeleteItem(item.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {isAdding ? (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Add new item..."
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center text-blue-500 hover:text-blue-600 mt-2"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add item
          </button>
        )}
      </div>
    </div>
  );
};

export default ChecklistCategory;