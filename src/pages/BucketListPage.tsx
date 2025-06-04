import React, { useState } from 'react';
import Layout from '../components/Layout';
import BucketListItem from '../components/BucketListItem';
import { mockBucketList } from '../data/mockData';
import { BucketListItem as BucketListItemType } from '../types';

const BucketListPage: React.FC = () => {
  const [bucketList, setBucketList] = useState<BucketListItemType[]>(mockBucketList);
  
  const handleToggleItem = (id: string, completed: boolean) => {
    setBucketList(bucketList.map(item => 
      item.id === id ? { ...item, completed } : item
    ));
  };
  
  return (
    <Layout title="Bucket List">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your Travel Bucket List</h2>
          <span className="text-sm font-medium text-blue-500">
            {bucketList.filter(item => item.completed).length}/{bucketList.length}
          </span>
        </div>

        {bucketList.map(item => (
          <BucketListItem 
            key={item.id} 
            item={item} 
            onToggle={handleToggleItem}
          />
        ))}
      </div>
    </Layout>
  );
};

export default BucketListPage;