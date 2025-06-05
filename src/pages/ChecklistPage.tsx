import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { ChecklistItem, ChecklistCategory as CategoryType } from '../types';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const ChecklistPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChecklist();
  }, []);

  const loadChecklist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: items, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (error) throw error;

      const grouped = (items || []).reduce((acc: CategoryType[], item) => {
        const existing = acc.find(c => c.name === item.category);
        const entry: ChecklistItem = {
          id: item.id,
          category: item.category,
          description: item.description,
          isCompleted: item.is_completed,
          isDefault: item.is_default
        };
        if (existing) {
          existing.items.push(entry);
        } else {
          acc.push({
            id: item.category,
            name: item.category,
            emoji: item.category.split(' ')[0],
            items: [entry]
          });
        }
        return acc;
      }, []);

      setCategories(grouped);
    } catch (err) {
      console.error('Error loading checklist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = async (id: string) => {
    const allItems = categories.flatMap(c => c.items);
    const item = allItems.find(i => i.id === id);
    if (!item) return;

    try {
      const { error } = await supabase
        .from('checklist_items')
        .update({ is_completed: !item.isCompleted })
        .eq('id', id);
      if (error) throw error;

      setCategories(categories.map(cat => ({
        ...cat,
        items: cat.items.map(i =>
          i.id === id ? { ...i, isCompleted: !i.isCompleted } : i
        )
      })));
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleAddItem = async (category: string, description = 'New item') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('checklist_items')
        .insert({
          user_id: user.id,
          category,
          description,
          is_completed: false,
          is_default: false
        })
        .select()
        .single();

      if (error) throw error;

      setCategories(categories.map(cat =>
        cat.name === category
          ? { ...cat, items: [...cat.items, {
              id: data.id,
              category: data.category,
              description: data.description,
              isCompleted: data.is_completed,
              isDefault: data.is_default
            }] }
          : cat
      ));
    } catch (err) {
      console.error('Add error:', err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', id);
      if (error) throw error;

      setCategories(categories.map(cat => ({
        ...cat,
        items: cat.items.filter(i => i.id !== id)
      })));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const completedCount = categories.reduce((sum, c) => sum + c.items.filter(i => i.isCompleted).length, 0);
  const totalCount = categories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <Layout title="Pre-Trip Checklist">
      <div className="min-h-screen bg-black px-4 py-12 text-white">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="flex justify-between items-center">
            <h2 className="pixel-text text-2xl text-white">YOUR TRAVEL CHECKLIST</h2>
            <span className="pixel-text text-sm text-blue-400">{completedCount}/{totalCount}</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : categories.length > 0 ? (
            <div className="space-y-10">
              {categories.map(category => (
                <div key={category.id} className="bg-gray-900 p-6 border border-blue-500/10 rounded">
                  <h3 className="pixel-text text-lg text-blue-400 mb-4">
                    {category.emoji} {category.name.split(' ').slice(1).join(' ')}
                  </h3>
                  <div className="space-y-3">
                    {category.items.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center bg-gray-800 border border-blue-500/10 p-4 rounded hover:border-blue-500/30 transition-colors"
                      >
                        <button
                          onClick={() => handleToggleItem(item.id)}
                          className={`flex items-center justify-center w-6 h-6 border-2 mr-4 ${
                            item.isCompleted
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-600 hover:border-green-500'
                          }`}
                        >
                          {item.isCompleted && '✓'}
                        </button>
                        <span className={`outfit-text ${item.isCompleted ? 'text-gray-500 line-through' : 'text-white'}`}>
                          {item.description}
                        </span>
                        {!item.isDefault && (
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="ml-auto text-red-500 hover:text-red-400 pixel-text"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleAddItem(category.name)}
                    className="mt-4 text-blue-400 hover:text-blue-300 pixel-text text-sm"
                  >
                    + ADD ITEM
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-900 border border-blue-500/10 rounded">
              <p className="pixel-text text-gray-400 mb-2">NO CHECKLIST ITEMS FOUND</p>
              <p className="outfit-text text-gray-500">Add items to help organize your trip preparations!</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ChecklistPage;
