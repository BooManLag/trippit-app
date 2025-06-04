import React from 'react';
import Layout from '../components/Layout';
import BadgeItem from '../components/BadgeItem';
import { mockBadges } from '../data/mockData';

const BadgesPage: React.FC = () => {
  const unlockedBadges = mockBadges.filter(badge => badge.unlocked);
  const lockedBadges = mockBadges.filter(badge => !badge.unlocked);
  
  return (
    <Layout title="Badges">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your Achievements</h2>
          <span className="text-sm font-medium text-blue-500">
            {unlockedBadges.length}/{mockBadges.length}
          </span>
        </div>

        {unlockedBadges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 text-gray-700">Unlocked</h3>
            {unlockedBadges.map(badge => (
              <BadgeItem key={badge.id} badge={badge} />
            ))}
          </div>
        )}

        {lockedBadges.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-3 text-gray-700">Locked</h3>
            {lockedBadges.map(badge => (
              <BadgeItem key={badge.id} badge={badge} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BadgesPage;