import React, { useState } from 'react';
import { Scenario, Choice } from '../types';
import Card from './Card';
import ChoiceButton from './ChoiceButton';
import Button from './Button';

interface ScenarioCardProps {
  scenario: Scenario;
  onComplete: () => void;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, onComplete }) => {
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [showOutcome, setShowOutcome] = useState(false);

  const handleChoiceSelect = (choice: Choice) => {
    setSelectedChoice(choice);
    setShowOutcome(true);
  };

  const handleContinue = () => {
    setSelectedChoice(null);
    setShowOutcome(false);
    onComplete();
  };

  return (
    <Card className="scenario-card">
      {!showOutcome ? (
        <div className="scenario-question">
          <h3 className="text-xl font-bold text-gray-800 mb-4">{scenario.title}</h3>
          <p className="text-gray-700 mb-6">{scenario.description}</p>
          <div className="choices">
            {scenario.choices.map((choice) => (
              <ChoiceButton 
                key={choice.id} 
                choice={choice} 
                onSelect={handleChoiceSelect} 
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="scenario-outcome">
          <h3 className="text-xl font-bold text-gray-800 mb-2">Outcome</h3>
          <p className="text-gray-700 mb-6">{selectedChoice?.outcome}</p>
          <div className="flex justify-end">
            <Button onClick={handleContinue}>Continue</Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ScenarioCard;