import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import { MapPin, Calendar, ThumbsUp } from 'lucide-react';

const TripCreatedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout title="Trip Created">
      <Card>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <ThumbsUp className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Your Trip is Ready!</h2>
          <p className="text-gray-600 mt-2">
            Time to start planning your adventure
          </p>
        </div>

        <div className="border-t border-b py-4 mb-6">
          <div className="flex items-center mb-3">
            <MapPin className="h-5 w-5 text-gray-500 mr-2" />
            <span className="text-gray-700">Paris, France</span>
          </div>
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-500 mr-2" />
            <span className="text-gray-700">June 10 - June 17, 2025</span>
          </div>
        </div>

        <p className="text-gray-700 mb-6">
          What would you like to do next?
        </p>

        <div className="space-y-3">
          <Button 
            fullWidth 
            onClick={() => navigate('/tips')}
          >
            Browse Travel Tips
          </Button>
          <Button 
            fullWidth 
            variant="secondary"
            onClick={() => navigate('/game')}
          >
            Try Travel Scenarios
          </Button>
          <Button 
            fullWidth 
            variant="secondary"
            onClick={() => navigate('/bucket-list')}
          >
            View Bucket List
          </Button>
        </div>
      </Card>
    </Layout>
  );
};

export default TripCreatedPage;