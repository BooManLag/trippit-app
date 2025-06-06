import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ChecklistItem } from '../types';
import { Loader2, ArrowLeft, PlusCircle, Trash2, CheckCircle2, Sparkles, Target } from 'lucide-react';
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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
  const progressPercentage = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-black text-white mobile-padding py-6 sm:py-8 lg:py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-2 h-2 bg-green-500 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-yellow-400 rounded-full animate-ping opacity-40"></div>
        <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce opacity-50"></div>
        <div className="absolute top-1/2 right-10 w-1 h-1 bg-blue-400 rounded-full animate-pulse opacity-30"></div>
        <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-pink-500 rounded-full animate-ping opacity-40"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 lg:mb-12 gap-4 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="text-blue-400 hover:text-blue-300 transition-colors hover:scale-110">
              <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
            <div>
              <h2 className="pixel-text mobile-heading text-green-400 glow-text">TRIP CHECKLIST</h2>
              <p className="outfit-text text-gray-400 mt-1 text-sm sm:text-base">Stay organized and prepared</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="pixel-text text-green-400 text-lg sm:text-xl">
                {completedCount}/{items.length}
              </div>
              <div className="pixel-text text-xs text-gray-400">COMPLETED</div>
            </div>
            <div className="text-center">
              <div className="pixel-text text-blue-400 text-lg sm:text-xl">
                {Math.round(progressPercentage)}%
              </div>
              <div className="pixel-text text-xs text-gray-400">PROGRESS</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`pixel-card bg-gradient-to-r from-green-900/20 to-blue-900/20 mb-6 sm:mb-8 border-2 border-green-500/30 animate-slide-in-up delay-200`}>
          <div className="flex items-center gap-4 mb-4">
            <Target className="w-6 h-6 text-green-400 animate-pulse" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="pixel-text text-green-400 text-sm">PREPARATION PROGRESS</span>
                <span className="pixel-text text-green-400 text-sm">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-700 h-4 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 h-full transition-all duration-500 flex items-center justify-center"
                  style={{ width: `${progressPercentage}%` }}
                >
                  {progressPercentage > 20 && (
                    <span className="pixel-text text-xs text-black font-bold">
                      {Math.round(progressPercentage)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-[60vh]">
            <div className="animate-bounce-in">
              <Loader2 className="w-8 sm:w-12 h-8 sm:h-12 text-green-500 animate-spin" />
              <p className="pixel-text text-green-400 mt-4 text-sm sm:text-base">LOADING CHECKLIST...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8 lg:space-y-12">
            {defaultChecklist.map((category, categoryIndex) => {
              const categoryItems = groupedItems[category.name] || [];
              return (
                <div 
                  key={category.id} 
                  className={`pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-green-500/20 hover:border-green-500/40 transition-all duration-300 animate-slide-in-left`}
                  style={{ animationDelay: `${categoryIndex * 100 + 300}ms` }}
                >
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="text-2xl sm:text-3xl animate-float" style={{ animationDelay: `${categoryIndex * 200}ms` }}>
                      {category.emoji}
                    </div>
                    <h3 className="pixel-text text-sm sm:text-base lg:text-lg text-green-400 glow-text">
                      {category.name.split(' ').slice(1).join(' ')}
                    </h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-green-500/50 to-transparent"></div>
                    <div className="pixel-text text-xs text-gray-400">
                      {categoryItems.filter(item => item.is_completed).length}/{categoryItems.length}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {categoryItems.map((item, itemIndex) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between px-3 sm:px-4 py-3 border transition-all duration-300 group hover:scale-[1.02] ${
                          item.is_completed
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-gray-800 border-green-500/10 hover:border-green-500/30'
                        }`}
                        style={{ animationDelay: `${categoryIndex * 100 + itemIndex * 50 + 400}ms` }}
                      >
                        <div
                          onClick={() => toggleComplete(item)}
                          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                        >
                          <div className="relative">
                            <CheckCircle2
                              className={`w-5 sm:w-6 h-5 sm:h-6 flex-shrink-0 transition-all duration-300 ${
                                item.is_completed 
                                  ? 'text-green-400 scale-110' 
                                  : 'text-gray-500 group-hover:text-green-400 group-hover:scale-110'
                              }`}
                            />
                            {item.is_completed && (
                              <div className="absolute inset-0 animate-ping">
                                <CheckCircle2 className="w-5 sm:w-6 h-5 sm:h-6 text-green-400 opacity-75" />
                              </div>
                            )}
                          </div>
                          <span
                            className={`outfit-text text-sm sm:text-base break-words transition-all duration-300 ${
                              item.is_completed 
                                ? 'line-through text-gray-400' 
                                : 'text-white group-hover:text-green-300'
                            }`}
                          >
                            {item.description}
                          </span>
                        </div>
                        {!item.is_default && (
                          <button 
                            onClick={() => deleteItem(item.id)} 
                            className="text-red-500 hover:text-red-400 transition-all duration-300 p-1 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:scale-110"
                          >
                            <Trash2 className="w-4 sm:w-5 h-4 sm:h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Show custom items if any */}
            {groupedItems['✨ Custom'] && (
              <div className={`pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 animate-slide-in-right delay-700`}>
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="text-2xl sm:text-3xl animate-float delay-700">✨</div>
                  <h3 className="pixel-text text-sm sm:text-base lg:text-lg text-blue-400 glow-text">Custom Items</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-transparent"></div>
                </div>
                <div className="space-y-3">
                  {groupedItems['✨ Custom'].map((item, index) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between px-3 sm:px-4 py-3 border transition-all duration-300 group hover:scale-[1.02] ${
                        item.is_completed
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-gray-800 border-blue-500/10 hover:border-blue-500/30'
                      }`}
                    >
                      <div
                        onClick={() => toggleComplete(item)}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      >
                        <CheckCircle2
                          className={`w-5 sm:w-6 h-5 sm:h-6 flex-shrink-0 transition-all duration-300 ${
                            item.is_completed 
                              ? 'text-green-400 scale-110' 
                              : 'text-gray-500 group-hover:text-blue-400 group-hover:scale-110'
                          }`}
                        />
                        <span
                          className={`outfit-text text-sm sm:text-base break-words transition-all duration-300 ${
                            item.is_completed 
                              ? 'line-through text-gray-400' 
                              : 'text-white group-hover:text-blue-300'
                          }`}
                        >
                          {item.description}
                        </span>
                      </div>
                      <button 
                        onClick={() => deleteItem(item.id)} 
                        className="text-red-500 hover:text-red-400 transition-all duration-300 p-1 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:scale-110"
                      >
                        <Trash2 className="w-4 sm:w-5 h-4 sm:h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add new item */}
        <div className={`mt-8 sm:mt-12 pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-blue-500/20 animate-slide-in-up delay-800`}>
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <Sparkles className="w-6 h-6 text-blue-400 animate-pulse" />
            <h3 className="pixel-text text-sm sm:text-base lg:text-lg text-blue-400 glow-text">ADD CUSTOM ITEM</h3>
          </div>
          <div className="space-y-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-blue-500/20 text-white rounded-none outline-none text-sm sm:text-base hover:border-blue-500/40 transition-colors"
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
                placeholder="Add a new task to your checklist..."
                className="flex-1 input-pixel"
                onKeyPress={(e) => e.key === 'Enter' && addItem()}
              />
              <button
                onClick={addItem}
                disabled={!newItem.trim()}
                className="pixel-button-primary flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50 hover-float"
              >
                <PlusCircle className="w-4 sm:w-5 h-4 sm:h-5" />
                ADD ITEM
              </button>
            </div>
          </div>
        </div>

        {/* Motivational Footer */}
        {items.length > 0 && (
          <div className={`text-center mt-8 sm:mt-12 animate-slide-in-up delay-900`}>
            <p className="outfit-text text-gray-500 text-sm sm:text-base">
              {progressPercentage === 100 
                ? '🎉 Congratulations! You\'re fully prepared for your adventure! 🎉'
                : `✨ ${items.length - completedCount} items left to complete your preparation ✨`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChecklistPage;