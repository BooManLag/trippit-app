import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import { MapPin, Calendar, Search, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import countries from '../data/countries.min.json';

interface Location {
  city: string;
  country: string;
  population?: number;
}

const CreateTripPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFirstTrip, setIsFirstTrip] = useState(false);

  useEffect(() => {
    const checkFirstTrip = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data: trips } = await supabase
        .from('trips')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      setIsFirstTrip(!trips || trips.length === 0);
    };

    checkFirstTrip();
  }, [navigate]);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setLocations([]);
      return;
    }

    try {
      const results: Location[] = [];

      for (const country in countries) {
        countries[country].forEach((city: string) => {
          if (city.toLowerCase().includes(debouncedSearch.toLowerCase())) {
            results.push({ city, country });
          }
        });
      }

      setLocations(results.slice(0, 10));
      setShowDropdown(true);
    } catch (error) {
      console.error('Error filtering locations from JSON:', error);
      setLocations([]);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { error } = await supabase.from('trips').insert({
        user_id: user.id,
        destination: `${selectedLocation.city}, ${selectedLocation.country}`,
        start_date: startDate,
        end_date: endDate,
      });

      if (error) throw error;
      
      navigate('/trip-created', {
        state: {
          destination: `${selectedLocation.city}, ${selectedLocation.country}`,
          startDate,
          endDate,
          isFirstTrip
        }
      });
    } catch (error) {
      console.error('Error creating trip:', error);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="pixel-card bg-gray-900 p-8 border-2 border-blue-500/20">
          <div className="text-center mb-8">
            <MapPin className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            {isFirstTrip ? (
              <>
                <h2 className="pixel-text text-2xl mb-2">YOUR FIRST ADVENTURE!</h2>
                <p className="outfit-text text-gray-400">Let's make it memorable</p>
              </>
            ) : (
              <>
                <h2 className="pixel-text text-2xl mb-2">PLAN YOUR ADVENTURE</h2>
                <p className="outfit-text text-gray-400">Let's create your perfect trip</p>
              </>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <label className="block pixel-text text-sm mb-2 text-blue-400">
                WHERE ARE YOU GOING?
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full px-4 pr-10 py-3 bg-gray-800 border-2 border-blue-500/20 text-white rounded-none focus:outline-none focus:border-blue-500/50"
                  placeholder="Search for a city..."
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {loading ? (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              </div>

              {showDropdown && locations.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border-2 border-blue-500/20 max-h-60 overflow-auto">
                  {locations.map((location, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full px-4 py-3 text-left hover:bg-gray-700"
                      onClick={() => handleLocationSelect(location)}
                    >
                      <div className="font-medium text-white">{location.city}</div>
                      <div className="text-sm text-gray-400">{location.country}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block pixel-text text-sm mb-2 text-blue-400">
                  START DATE
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={today}
                    className="w-full px-4 pr-10 py-3 bg-gray-800 border-2 border-blue-500/20 text-white focus:outline-none focus:border-blue-500/50"
                    required
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block pixel-text text-sm mb-2 text-blue-400">
                  END DATE
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || today}
                    className="w-full px-4 pr-10 py-3 bg-gray-800 border-2 border-blue-500/20 text-white focus:outline-none focus:border-blue-500/50"
                    required
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="pixel-button-secondary bg-gray-700 hover:bg-gray-600"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={!selectedLocation || !startDate || !endDate}
                className="pixel-button-primary bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
              >
                {isFirstTrip ? 'START ADVENTURE' : 'CREATE TRIP'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTripPage;