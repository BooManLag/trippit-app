import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ChecklistItem } from '../types';
import { Loader2, ArrowLeft, PlusCircle, Trash2, CheckCircle2 } from 'lucide-react';
import { defaultChecklist } from '../data/defaultChecklist';

interface GroupedItems {
  [category: string]: ChecklistItem[];
}

const ChecklistPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');
  const navigate = useNavigate();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(defaultChecklist[0].name);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !tripId) {
        navigate('/');
        return;
      }

      // First, check if checklist items exist for this trip
      const { data: existingItems, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('trip_id', tripId);

      if (error) {
        console.error('Error fetching checklist:', error);
        setLoading(false);
        return;
      }

      // If no items exist, create default ones
      if (!existingItems || existingItems.length === 0) {
        console.log('No checklist items found, creating defaults...');
        
        // Create default checklist items
        const defaultItems = [];
        defaultChecklist.forEach(category => {
          category.items.forEach(item => {
            defaultItems.push({
              user_id: user.id,
              trip_id: tripId,
              category: category.name,
              description: item.description,
              is_completed: false,
              is_default: true
            });
          });
        });

        // Insert all default items
        const { data: insertedItems, error: insertError } = await supabase
          .from('checklist_items')
          .insert(defaultItems)
          .select();

        if (insertError) {
          console.error('Error creating default checklist items:', insertError);
        } else {
          setItems(insertedItems || []);
        }
      } else {
        setItems(existingItems);
      }

      setLoading(false);
    };

    fetchItems();
  }, [tripId, navigate]);

  const toggleComplete = async (item: ChecklistItem) => {
    const { error } = await supabase
      .from('checklist_items')
      .update({ is_completed: !item.is_completed })
      .eq('id', item.id);

    if (!error) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_completed: !i.is_completed } : i
        )
      );
    }
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('checklist_items').delete().eq('id', id);
    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const addItem = async () => {
    if (!newItem.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('checklist_items')
      .insert({
        user_id: user!.id,
        trip_id: tripId,
        description: newItem.trim(),
        category: selectedCategory,
        is_completed: false,
        is_default: false
      })
      .select();

    if (!error && data) {
      setItems([...items, data[0]]);
      setNewItem('');
    }
  };

  const groupedItems = items.reduce<GroupedItems>((acc, item) => {
    const category = item.category || '✨ Custom';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  const completedCount = items.filter(item => item.is_completed).length;

  return (
    <div className="min-h-screen bg-black text-white mobile-padding py-6 sm:py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-blue-400 hover:text-blue-300">
              <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
            <h2 className="pixel-text mobile-heading">TRIP CHECKLIST</h2>
          </div>
          <div className="pixel-text text-xs sm:text-sm text-blue-400">
            {completedCount}/{items.length}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-[60vh]">
            <Loader2 className="w-5 sm:w-6 h-5 sm:h-6 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {defaultChecklist.map(category => {
              const categoryItems = groupedItems[category.name] || [];
              return (
                <div key={category.id} className="pixel-card bg-gray-900 border-2 border-blue-500/20">
                  <h3 className="pixel-text text-sm sm:text-lg text-blue-400 mb-4">
                    {category.emoji} {category.name.split(' ').slice(1).join(' ')}
                  </h3>
                  <div className="space-y-3">
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between px-3 sm:px-4 py-3 border ${
                          item.is_completed
                            ? 'bg-green-500/10 border-green-500/20'
                            : 'bg-gray-800 border-blue-500/10'
                        }`}
                      >
                        <div
                          onClick={() => toggleComplete(item)}
                          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                        >
                          <CheckCircle2
                            className={`w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0 ${
                              item.is_completed ? 'text-green-400' : 'text-gray-500'
                            }`}
                          />
                          <span
                            className={`outfit-text text-sm sm:text-base break-words ${
                              item.is_completed ? 'line-through text-gray-400' : 'text-white'
                            }`}
                          >
                            {item.description}
                          </span>
                        </div>
                        <button 
                          onClick={() => deleteItem(item.id)} 
                          className="text-red-500 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                        >
                          <Trash2 className="w-3 sm:w-4 h-3 sm:h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Show custom items if any */}
            {groupedItems['✨ Custom'] && (
              <div className="pixel-card bg-gray-900 border-2 border-blue-500/20">
                <h3 className="pixel-text text-sm sm:text-lg text-blue-400 mb-4">
                  ✨ Custom Items
                </h3>
                <div className="space-y-3">
                  {groupedItems['✨ Custom'].map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between px-3 sm:px-4 py-3 border ${
                        item.is_completed
                          ? 'bg-green-500/10 border-green-500/20'
                          : 'bg-gray-800 border-blue-500/10'
                      }`}
                    >
                      <div
                        onClick={() => toggleComplete(item)}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      >
                        <CheckCircle2
                          className={`w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0 ${
                            item.is_completed ? 'text-green-400' : 'text-gray-500'
                          }`}
                        />
                        <span
                          className={`outfit-text text-sm sm:text-base break-words ${
                            item.is_completed ? 'line-through text-gray-400' : 'text-white'
                          }`}
                        >
                          {item.description}
                        </span>
                      </div>
                      <button 
                        onClick={() => deleteItem(item.id)} 
                        className="text-red-500 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                      >
                        <Trash2 className="w-3 sm:w-4 h-3 sm:h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add new item */}
        <div className="mt-6 sm:mt-8 pixel-card bg-gray-900 border-2 border-blue-500/20">
          <h3 className="pixel-text text-sm sm:text-lg text-blue-400 mb-4">ADD NEW ITEM</h3>
          <div className="space-y-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-blue-500/20 text-white rounded-none outline-none text-sm sm:text-base"
            >
              {defaultChecklist.map(category => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
              <option value="✨ Custom">✨ Custom</option>
            </select>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Add a new task..."
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-blue-500/20 text-white rounded-none outline-none text-sm sm:text-base"
                onKeyPress={(e) => e.key === 'Enter' && addItem()}
              />
              <button
                onClick={addItem}
                className="pixel-button-primary flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <PlusCircle className="w-3 sm:w-4 h-3 sm:h-4" />
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistPage;