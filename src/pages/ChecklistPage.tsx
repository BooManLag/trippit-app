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
      
      // Query checklist items based on authentication status
      const { data: items, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq(user ? 'user_id' : 'user_id', user ? user.id : null)
        .order('created_at');

      if (error) throw error;

      // Group items by category
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
      const item = categories
        .flatMap(cat => cat.items)
        .find(item => item.id === id);

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
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Travel Checklist</h2>
          <span className="text-sm font-medium text-blue-500">
            {completedCount}/{totalCount} completed
          </span>
        </div>

        {categories.length > 0 ? (
          categories.map(category => (
            <ChecklistCategory
              key={category.id}
              name={category.name}
              items={category.items}
              onToggleItem={handleToggleItem}
              onAddItem={handleAddItem}
              onDeleteItem={handleDeleteItem}
            />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No checklist items found.</p>
            <p className="mt-2">Add items to help organize your trip preparations!</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ChecklistPage;