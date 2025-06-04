import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import { Calendar, MapPin, PlusCircle } from 'lucide-react';
import { mockTrips } from '../data/mockData';

const MyTripsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout title="My Trips">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your Trips</h2>
          <Button
            variant="primary"
            className="inline-flex items-center"
            onClick={() => navigate('/create-trip')}
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            New Trip
          </Button>
        </div>

        {mockTrips.length > 0 ? (
          <div>
            {mockTrips.map(trip => (
              <Card key={trip.id} onClick={() => navigate(`/trips/${trip.id}`)}>
                <h3 className="text-lg font-semibold text-gray-800">{trip.destination}</h3>
                <div className="flex items-center mt-2 text-gray-600">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span className="text-sm">
                    {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No trips yet</h3>
            <p className="text-gray-500 mb-4">Create your first trip to get started</p>
            <Button onClick={() => navigate('/create-trip')}>
              Create Trip
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyTripsPage;