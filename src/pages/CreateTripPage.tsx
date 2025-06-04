import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Card from '../components/Card';
import { MapPin, Calendar, Search, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Location {
  city: string;
  country: string;
  countryCode: string;
}

const CreateTripPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 500);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const searchLocations = async () => {
      if (debouncedSearch.length < 2) {
        setLocations([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${debouncedSearch}&limit=5&sort=-population`,
          {
            headers: {
              'X-RapidAPI-Key': import.meta.env.VITE_RAPIDAPI_KEY,
              'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com'
            }
          }
        );
        const data = await response.json();
        const formattedLocations = data.data.map((item: any) => ({
          city: item.city,
          country: item.country,
          countryCode: item.countryCode
        }));
        setLocations(formattedLocations);
        setShowDropdown(true);
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (debouncedSearch) {
      searchLocations();
    }
  }, [debouncedSearch]);

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setSearchTerm(`${location.city}, ${location.country}`);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) return;

    try {
      const { error } = await supabase.from('trips').insert({
        destination: `${selectedLocation.city}, ${selectedLocation.country}`,
        start_date: startDate,
        end_date: endDate
      });

      if (error) throw error;
      navigate('/trip-created');
    } catch (error) {
      console.error('Error creating trip:', error);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Layout title="Create Trip">
      <Card>
        <div className="text-center mb-8">
          <MapPin className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">Plan Your Adventure</h2>
          <p className="text-gray-600 mt-2">Let's create your perfect trip</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Where are you going?
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                className="w-full px-4 py-2 border rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search for a city..."
                required
              />
              <div className="absolute right-3 top-2.5">
                {loading ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : (
                  <Search className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
            
            {showDropdown && locations.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto">
                {locations.map((location, index) => (
                  <button
                    key={index}
                    type="button"
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:outline-none"
                    onClick={() => handleLocationSelect(location)}
                  >
                    <div className="font-medium">{location.city}</div>
                    <div className="text-sm text-gray-600">{location.country}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Start Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={today}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <Calendar className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                End Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || today}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <Calendar className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button 
              variant="secondary" 
              onClick={() => navigate('/')}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!selectedLocation || !startDate || !endDate}
            >
              Create Trip
            </Button>
          </div>
        </form>
      </Card>
    </Layout>
  );
};

export default CreateTripPage;