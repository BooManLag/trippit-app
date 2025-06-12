import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import { MapPin, Calendar, Search, Loader2, Sparkles, Globe } from 'lucide-react';
import { supabase, isAuthenticated, ensureUserProfile } from '../lib/supabase';
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
  const [maxParticipants, setMaxParticipants] = useState(2);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        navigate('/');
        return;
      }
    };

    checkAuth();
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
    setError(null); // Clear any previous errors
  };

  const validateManualLocation = (input: string): Location | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Check if it matches the format "City, Country"
    const parts = trimmed.split(',').map(part => part.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      return {
        city: parts[0],
        country: parts[1]
      };
    }

    // If it's just one part, assume it's a city and try to find a matching country
    if (parts.length === 1 && parts[0]) {
      const cityName = parts[0].toLowerCase();
      
      // Search through our countries data to find a match
      for (const country in countries) {
        const cities = countries[country];
        const matchingCity = cities.find(city => 
          city.toLowerCase() === cityName
        );
        if (matchingCity) {
          return {
            city: matchingCity,
            country: country
          };
        }
      }
      
      // If no exact match found, allow manual entry but warn user
      return {
        city: parts[0],
        country: 'Unknown'
      };
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate location - either selected from dropdown or manually entered
    let locationToUse = selectedLocation;
    
    if (!locationToUse && searchTerm.trim()) {
      // Try to validate manual entry
      locationToUse = validateManualLocation(searchTerm);
      if (!locationToUse) {
        setError('Please enter a valid destination in the format "City, Country" or select from the dropdown');
        return;
      }
      
      // Warn if country is unknown
      if (locationToUse.country === 'Unknown') {
        setError('Could not find this city in our database. Please select from the dropdown for better results, or enter in format "City, Country"');
        return;
      }
    }
    
    if (!locationToUse) {
      setError('Please enter or select a destination');
      return;
    }

    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError('End date must be after start date');
      return;
    }

    // Check if start date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripStart = new Date(startDate);
    tripStart.setHours(0, 0, 0, 0);
    
    if (tripStart < today) {
      setError('Start date cannot be in the past');
      return;
    }

    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be signed in to create a trip');
        navigate('/');
        return;
      }

      console.log('Current user:', user.id);

      // Ensure user profile exists before creating trip
      try {
        const userProfile = await ensureUserProfile();
        if (!userProfile) {
          setError('Failed to create user profile. Please try again.');
          return;
        }
        console.log('User profile ensured:', userProfile);
      } catch (profileError: any) {
        console.error('Profile creation error:', profileError);
        setError(`Profile error: ${profileError.message}`);
        return;
      }

      const tripData = {
        user_id: user.id,
        destination: `${locationToUse.city}, ${locationToUse.country}`,
        start_date: startDate,
        end_date: endDate,
        max_participants: maxParticipants,
      };

      console.log('Creating trip with data:', tripData);

      const { data: createdTrip, error: tripError } = await supabase
        .from('trips')
        .insert(tripData)
        .select()
        .single();

      if (tripError) {
        console.error('Error creating trip:', tripError);
        
        // Provide more user-friendly error messages
        if (tripError.message.includes('infinite recursion')) {
          setError('Database configuration issue. Please try again in a moment.');
        } else if (tripError.message.includes('permission')) {
          setError('Permission denied. Please make sure you are signed in.');
        } else {
          setError(`Failed to create trip: ${tripError.message}`);
        }
        return;
      }

      console.log('Trip created successfully:', createdTrip);

      // The trigger will automatically add the user as a participant with 'owner' role
      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Navigate to my trips page
      navigate('/my-trips');
    } catch (error: any) {
      console.error('Error creating trip:', error);
      setError(error.message || 'Failed to create trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const participantOptions = [
    { value: 1, label: 'Solo Adventure', icon: '🧳', description: 'Just me' },
    { value: 2, label: 'Duo Trip', icon: '👫', description: 'Me + 1 friend' },
    { value: 3, label: 'Small Group', icon: '👥', description: 'Me + 2 friends' },
    { value: 4, label: 'Squad Goals', icon: '🎉', description: 'Me + 3 friends' },
    { value: 6, label: 'Big Group', icon: '🎊', description: 'Me + 5 friends' },
    { value: 8, label: 'Party Mode', icon: '🎈', description: 'Me + 7 friends' },
  ];

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-2 h-2 bg-blue-500 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-yellow-400 rounded-full animate-ping opacity-40"></div>
        <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce opacity-50"></div>
        <div className="absolute top-1/2 right-10 w-1 h-1 bg-green-400 rounded-full animate-pulse opacity-30"></div>
        <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-pink-500 rounded-full animate-ping opacity-40"></div>
      </div>

      <div className="container mx-auto mobile-padding py-8 sm:py-12 lg:py-16 max-w-4xl relative z-10">
        <div className={`pixel-card bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-blue-500/30 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8 lg:mb-12">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg blur-xl opacity-30 animate-pulse"></div>
              <div className="relative flex items-center justify-center gap-4">
                <Globe className="w-8 sm:w-10 lg:w-12 h-8 sm:h-10 lg:h-12 text-blue-500 animate-float" />
                <MapPin className="w-10 sm:w-12 lg:w-16 h-10 sm:h-12 lg:h-16 text-blue-500 animate-bounce" />
                <Sparkles className="w-8 sm:w-10 lg:w-12 h-8 sm:h-10 lg:h-12 text-yellow-400 animate-pulse" />
              </div>
            </div>
            <h2 className="pixel-text mobile-heading mb-4 glow-text animate-slide-in-up delay-200">PLAN YOUR EPIC ADVENTURE</h2>
            <p className="outfit-text text-gray-400 text-sm sm:text-base lg:text-lg animate-slide-in-up delay-300">
              Where will your next adventure take you? Let's create something amazing together!
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="pixel-card bg-red-500/10 border-2 border-red-500/30 mb-6 animate-bounce-in">
              <div className="flex items-center gap-3">
                <div className="text-red-400 text-xl">⚠️</div>
                <p className="outfit-text text-red-300 text-sm sm:text-base">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Location Search */}
            <div className={`relative animate-slide-in-left delay-400`}>
              <label className="block pixel-text text-xs sm:text-sm mb-3 text-blue-400 glow-text">
                🌍 WHERE ARE YOU GOING?
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedLocation(null); // Clear selection when typing
                    setError(null); // Clear errors when typing
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => {
                    // Delay hiding dropdown to allow for clicks
                    setTimeout(() => setShowDropdown(false), 200);
                  }}
                  className="w-full input-pixel pr-12"
                  placeholder="Enter destination (e.g., Paris, France) or search..."
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Search className="w-4 sm:w-5 h-4 sm:h-5 text-blue-500 animate-pulse" />
                </div>
              </div>

              {/* Dropdown with search results */}
              {showDropdown && locations.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-gray-800 border-2 border-blue-500/30 max-h-60 overflow-auto animate-slide-in-up">
                  {locations.map((location, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-all duration-300 border-b border-gray-700 last:border-b-0 group"
                      onClick={() => handleLocationSelect(location)}
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
                        <div>
                          <div className="font-medium text-white text-sm sm:text-base group-hover:text-blue-300 transition-colors">
                            {location.city}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                            {location.country}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Helper text */}
              <div className="mt-2 text-xs text-gray-500">
                💡 Type to search our database or enter manually in format "City, Country"
              </div>
            </div>

            {/* Date Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className={`animate-slide-in-left delay-500`}>
                <label className="block pixel-text text-xs sm:text-sm mb-3 text-blue-400 glow-text">
                  📅 START DATE
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setError(null);
                    }}
                    min={today}
                    className="w-full input-pixel pr-12"
                    required
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-blue-500 pointer-events-none animate-pulse" />
                </div>
              </div>

              <div className={`animate-slide-in-right delay-600`}>
                <label className="block pixel-text text-xs sm:text-sm mb-3 text-blue-400 glow-text">
                  📅 END DATE
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setError(null);
                    }}
                    min={startDate || today}
                    className="w-full input-pixel pr-12"
                    required
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-blue-500 pointer-events-none animate-pulse" />
                </div>
              </div>
            </div>

            {/* Participant Limit Selection */}
            <div className={`animate-slide-in-up delay-700`}>
              <label className="block pixel-text text-xs sm:text-sm mb-3 text-purple-400 glow-text">
                👥 HOW MANY ADVENTURERS?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {participantOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMaxParticipants(option.value)}
                    className={`p-3 sm:p-4 border-2 transition-all duration-300 hover:scale-105 group ${
                      maxParticipants === option.value
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                        : 'border-gray-600 hover:border-purple-500/50 text-gray-300 hover:text-purple-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl mb-1 group-hover:animate-bounce">
                        {option.icon}
                      </div>
                      <div className="pixel-text text-xs sm:text-sm mb-1">
                        {option.label}
                      </div>
                      <div className="outfit-text text-xs text-gray-400">
                        {option.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-3 text-center">
                <span className="pixel-text text-xs text-purple-400">
                  Selected: {maxParticipants} total adventurers
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className={`animate-slide-in-up delay-800`}>
              <button
                type="submit"
                disabled={loading}
                className="pixel-button-primary w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 py-4 sm:py-6 animate-pulse-glow"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 sm:w-6 h-5 sm:h-6 animate-spin" />
                    <span>CREATING ADVENTURE...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 sm:w-6 h-5 sm:h-6" />
                    <span>CREATE EPIC ADVENTURE</span>
                    <Sparkles className="w-5 sm:w-6 h-5 sm:h-6" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Motivational Footer */}
          <div className={`text-center mt-8 sm:mt-12 animate-slide-in-up delay-900`}>
            <p className="outfit-text text-gray-500 text-sm sm:text-base">
              ✨ Ready to create memories that will last a lifetime? ✨
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTripPage;