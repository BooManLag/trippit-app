import React, { useState } from 'react';
import Layout from '../components/Layout';
import ScenarioCard from '../components/ScenarioCard';
import { mockScenarios } from '../data/mockData';

const GamePage: React.FC = () => {
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [completedScenarios, setCompletedScenarios] = useState<string[]>([]);

  const handleScenarioComplete = () => {
    const completedId = mockScenarios[currentScenarioIndex].id;
    setCompletedScenarios([...completedScenarios, completedId]);
    
    // Move to next scenario or loop back
    const nextIndex = (currentScenarioIndex + 1) % mockScenarios.length;
    setCurrentScenarioIndex(nextIndex);
  };

  return (
    <Layout title="Where'd I Go?">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Travel Scenarios</h2>
        <p className="text-gray-600 mb-6">
          Make decisions in these travel situations. What would you do?
        </p>
        
        <div className="scenario-progress mb-4">
          <p className="text-sm text-gray-500">
            Scenario {currentScenarioIndex + 1} of {mockScenarios.length}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${((currentScenarioIndex + 1) / mockScenarios.length) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <ScenarioCard 
          scenario={mockScenarios[currentScenarioIndex]}
          onComplete={handleScenarioComplete}
        />
      </div>
    </Layout>
  );
};

export default GamePage;