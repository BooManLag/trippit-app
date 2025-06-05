import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ChecklistItem } from '../types';
import { Loader2, ArrowLeft, PlusCircle, Trash2, CheckCircle2 } from 'lucide-react';

const ChecklistPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');
  const navigate = useNavigate();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !tripId) {
        navigate('/');
        return;
      }

      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('trip_id', tripId);

      if (error) {
        console.error('Error fetching checklist:', error);
      } else {
        setItems(data || []);
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
        category: '✨ Custom',
        is_completed: false,
        is_default: false
      })
      .select();

    if (!error && data) {
      setItems([...items, data[0]]);
      setNewItem('');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-blue-400 hover:text-blue-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="pixel-text text-xl">TRIP CHECKLIST</h2>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-[60vh]">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between px-4 py-3 border ${
                  item.is_completed
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-gray-800 border-blue-500/10'
                }`}
              >
                <div
                  onClick={() => toggleComplete(item)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <CheckCircle2
                    className={`w-5 h-5 ${
                      item.is_completed ? 'text-green-400' : 'text-gray-500'
                    }`}
                  />
                  <span
                    className={`outfit-text ${
                      item.is_completed ? 'line-through text-gray-400' : 'text-white'
                    }`}
                  >
                    {item.description}
                  </span>
                </div>
                <button onClick={() => deleteItem(item.id)} className="text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new item */}
        <div className="mt-8">
          <div className="flex items-center gap-3">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add a new task..."
              className="w-full px-4 py-3 bg-gray-900 border border-blue-500/20 text-white rounded-none outline-none"
            />
            <button
              onClick={addItem}
              className="pixel-button-primary flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistPage;
