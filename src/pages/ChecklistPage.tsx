import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { defaultChecklist } from '../data/defaultChecklist';
import { ChecklistItem, ChecklistCategory as CategoryType } from '../types';
import { Loader2, Save } from 'lucide-react';
import BackButton from '../components/BackButton';

const ChecklistPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryType[]>(defaultChecklist);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Save to localStorage whenever categories change
  useEffect(() => {
    if (hasChanges) {
      localStorage.setItem('tripChecklist', JSON.stringify(categories));
    }
  }, [categories, hasChanges]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedChecklist = localStorage.getItem('tripChecklist');
    if (savedChecklist) {
      setCategories(JSON.parse(savedChecklist));
    }
  }, []);

  const handleToggleItem = (id: string) => {
    setCategories(categories.map(cat => ({
      ...cat,
      items: cat.items.map(i =>
        i.id === id ? { ...i, isCompleted: !i.isCompleted } : i
      )
    })));
    setHasChanges(true);
  };

  const handleAddItem = (category: string, description: string) => {
    const tempId = Math.random().toString(36).substring(7);
    setCategories(categories.map(cat =>
      cat.name === category
        ? {
            ...cat,
            items: [...cat.items, {
              id: tempId,
              category,
              description,
              isCompleted: false,
              isDefault: false
            }]
          }
        : cat
    ));
    setHasChanges(true);
  };

  const handleDeleteItem = (id: string) => {
    setCategories(categories.map(cat => ({
      ...cat,
      items: cat.items.filter(i => i.id !== id)
    })));
    setHasChanges(true);
  };

  const handleEditItem = (id: string, newDescription: string) => {
    setCategories(categories.map(cat => ({
      ...cat,
      items: cat.items.map(i =>
        i.id === id ? { ...i, description: newDescription } : i
      )
    })));
    setEditingItem(null);
    setEditText('');
    setHasChanges(true);
  };

  const handleBack = () => {
    if (hasChanges) {
      if (window.confirm('Do you want to save your changes before leaving?')) {
        localStorage.setItem('tripChecklist', JSON.stringify(categories));
      }
    }
    navigate(-1);
  };

  const completedCount = categories.reduce((sum, c) => sum + c.items.filter(i => i.isCompleted).length, 0);
  const totalCount = categories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div className="min-h-screen w-full bg-black px-4 py-10 text-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <BackButton onClick={handleBack} />
            <h2 className="pixel-text text-2xl">YOUR TRAVEL CHECKLIST</h2>
          </div>
          <span className="pixel-text text-sm text-blue-400">{completedCount}/{totalCount}</span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : categories.length > 0 ? (
          <div className="space-y-10">
            {categories.map(category => (
              <div key={category.id} className="bg-gray-900 p-5 rounded border border-blue-500/20">
                <h3 className="pixel-text text-lg text-blue-400 mb-4">
                  {category.emoji} {category.name.split(' ').slice(1).join(' ')}
                </h3>
                <div className="space-y-3">
                  {category.items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center bg-gray-800 p-4 rounded border border-blue-500/10 hover:border-blue-500/30"
                    >
                      <button
                        onClick={() => handleToggleItem(item.id)}
                        className={`w-6 h-6 flex items-center justify-center border-2 mr-4 ${
                          item.isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-500 hover:border-green-500'
                        }`}
                      >
                        {item.isCompleted && '✓'}
                      </button>
                      {editingItem === item.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleEditItem(item.id, editText);
                          }}
                          className="flex-1 flex gap-2"
                        >
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="flex-1 bg-gray-700 text-white px-3 py-1 rounded outline-none"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(null);
                              setEditText('');
                            }}
                            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <span
                          onClick={() => {
                            setEditingItem(item.id);
                            setEditText(item.description);
                          }}
                          className={`flex-1 cursor-pointer ${item.isCompleted ? 'line-through text-gray-500' : 'text-white'}`}
                        >
                          {item.description}
                        </span>
                      )}
                      {!item.isDefault && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="ml-auto text-red-400 hover:text-red-300 pixel-text"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setEditingItem('new');
                    setEditText('');
                    handleAddItem(category.name, 'New item');
                  }}
                  className="mt-4 text-blue-400 hover:text-blue-300 pixel-text text-sm"
                >
                  + ADD ITEM
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-900 rounded border border-blue-500/10">
            <p className="pixel-text text-gray-400 mb-2">NO CHECKLIST ITEMS FOUND</p>
            <p className="outfit-text text-gray-500">Add items to help organize your trip preparations!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChecklistPage;