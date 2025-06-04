import React, { useState } from 'react';
import Layout from '../components/Layout';
import TipCard from '../components/TipCard';
import { mockTips } from '../data/mockData';
import { Tip } from '../types';
import { Filter } from 'lucide-react';

const TipsPage: React.FC = () => {
  const [filter, setFilter] = useState<string | null>(null);
  const categories = Array.from(new Set(mockTips.map(tip => tip.category)));

  const filteredTips = filter 
    ? mockTips.filter(tip => tip.category === filter)
    : mockTips;

  return (
    <Layout title="Smart Tips">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Travel Tips</h2>
          <div className="relative">
            <button 
              className="flex items-center text-sm text-gray-600 hover:text-blue-500"
              onClick={() => document.getElementById('filter-menu')?.classList.toggle('hidden')}
            >
              <Filter className="h-4 w-4 mr-1" />
              {filter || 'All Categories'}
            </button>
            <div 
              id="filter-menu" 
              className="absolute right-0 mt-2 py-2 w-48 bg-white rounded-md shadow-xl z-20 hidden"
            >
              <button
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                onClick={() => setFilter(null)}
              >
                All Categories
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  onClick={() => setFilter(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="tips-container">
          {filteredTips.map((tip: Tip) => (
            <TipCard key={tip.id} tip={tip} />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default TipsPage;