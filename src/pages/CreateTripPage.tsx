import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import Layout from '../components/Layout';
import Button from '../components/Button';
import { MapPin, Calendar, Search, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Location {
  city: string;
  country: string;
  population: number;
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
          `https://secure.geonames.org/searchJSON?q=${encodeURIComponent(debouncedSearch)}&maxRows=5&orderby=population&cities=cities1000&username=${import.meta.env.VITE_GEONAMES_USERNAME}`
        );
        if (!response.ok) {
          throw new Error(`GeoNames error: ${response.status}`);
        }
        const data = await response.json();
        const formattedLocations = data.geonames.map((item: any) => ({
          city: item.name,
          country: item.countryName,
          population: item.population
        }));
        setLocations(formattedLocations);
        setShowDropdown(true);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setLocations([]);
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
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="pixel-card bg-gray-900 p-8 border-2 border-blue-500/20">
          <div className="text-center mb-8">
            <MapPin className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h2 className="pixel-text text-2xl mb-2">PLAN YOUR ADVENTURE</h2>
            <p className="outfit-text text-gray-400">Let's create your perfect trip</p>
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
                  className="w-full px-4 py-3 bg-gray-800 border-2 border-blue-500/20 text-white rounded-none focus:outline-none focus:border-blue-500/50 transition-colors duration-200"
                  placeholder="Search for a city..."
                  required
                />
                <div className="absolute right-3 top-3">
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
                      className="w-full px-4 py-3 text-left hover:bg-gray-700 focus:outline-none transition-colors duration-200"
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
                    className="w-full px-4 py-3 bg-gray-800 border-2 border-blue-500/20 text-white rounded-none focus:outline-none focus:border-blue-500/50 transition-colors duration-200"
                    required
                  />
                  <Calendar className="absolute right-3 top-3 w-5 h-5 text-blue-500" />
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
                    className="w-full px-4 py-3 bg-gray-800 border-2 border-blue-500/20 text-white rounded-none focus:outline-none focus:border-blue-500/50 transition-colors duration-200"
                    required
                  />
                  <Calendar className="absolute right-3 top-3 w-5 h-5 text-blue-500" />
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
                className="pixel-button-primary bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CREATE TRIP
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTripPage;