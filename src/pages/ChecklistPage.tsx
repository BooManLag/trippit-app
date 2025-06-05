import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ChecklistCategory from '../components/ChecklistCategory';
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
      const { data: items, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq(user ? 'user_id' : 'is_default', user ? user.id : true)
        .order('created_at');

      if (error) throw error;

      const groupedItems = (items || []).reduce((acc: CategoryType[], item) => {
        const existingCategory = acc.find(cat => cat.name === item.category);
        const checklistItem: ChecklistItem = {
          id: item.id,
          category: item.category,
          description: item.description,
          isCompleted: item.is_completed,
          isDefault: item.is_default
        };

        if (existingCategory) {
          existingCategory.items.push(checklistItem);
        } else {
          acc.push({
            id: item.category,
            name: item.category,
            emoji: item.category.split(' ')[0],
            items: [checklistItem]
          });
        }

        return acc;
      }, []);

      setCategories(groupedItems);
    } catch (error) {
      console.error('Error loading checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = async (id: string) => {
    try {
      const item = categories.flatMap(cat => cat.items).find(item => item.id === id);
      if (item) {
        const { error } = await supabase
          .from('checklist_items')
          .update({ is_completed: !item.isCompleted })
          .eq('id', id);
        if (error) throw error;

        setCategories(categories.map(category => ({
          ...category,
          items: category.items.map(item =>
            item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
          )
        })));
      }
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const handleAddItem = async (category: string, description: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: newItem, error } = await supabase
        .from('checklist_items')
        .insert({
          user_id: user?.id || null,
          category,
          description,
          is_completed: false,
          is_default: false
        })
        .select()
        .single();

      if (error) throw error;

      setCategories(categories.map(cat => {
        if (cat.name === category) {
          return {
            ...cat,
            items: [...cat.items, {
              id: newItem.id,
              category: newItem.category,
              description: newItem.description,
              isCompleted: newItem.is_completed,
              isDefault: newItem.is_default
            }]
          };
        }
        return cat;
      }));
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', id);
      if (error) throw error;

      setCategories(categories.map(category => ({
        ...category,
        items: category.items.filter(item => item.id !== id)
      })));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  if (loading) {
    return (
      <Layout title="Pre-Trip Checklist">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  const completedCount = categories.reduce((total, cat) =>
    total + cat.items.filter(item => item.isCompleted).length, 0
  );
  const totalCount = categories.reduce((total, cat) =>
    total + cat.items.length, 0
  );

  return (
    <Layout title="Pre-Trip Checklist">
      <div className="pixel-card bg-gray-900 p-8 border-2 border-blue-500/20">
        <div className="flex justify-between items-center mb-8">
          <h2 className="pixel-text text-2xl text-white">YOUR TRAVEL CHECKLIST</h2>
          <span className="pixel-text text-sm text-blue-400">
            {completedCount}/{totalCount}
          </span>
        </div>

        {categories.length > 0 ? (
          <div className="space-y-8">
            {categories.map(category => (
              <div key={category.id} className="pixel-card bg-gray-800/60 border-blue-500/10 p-6">
                <h3 className="pixel-text text-lg text-blue-400 mb-4">
                  {category.emoji} {category.name.split(' ').slice(1).join(' ')}
                </h3>
                <div className="space-y-3">
                  {category.items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center bg-gray-800 border-2 border-blue-500/10 p-4 hover:border-blue-500/30 transition-colors"
                    >
                      <button
                        onClick={() => handleToggleItem(item.id)}
                        className={`flex items-center justify-center w-6 h-6 border-2 mr-4 transition-colors ${
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
                  onClick={() => handleAddItem(category.name, '')}
                  className="mt-4 text-blue-400 hover:text-blue-300 pixel-text text-sm flex items-center"
                >
                  + ADD ITEM
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="pixel-text text-gray-400">NO CHECKLIST ITEMS FOUND</p>
            <p className="outfit-text text-gray-500 mt-2">Add items to help organize your trip preparations!</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ChecklistPage;
