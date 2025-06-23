import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, MapPin, Clock, DollarSign, Lightbulb, Download, Edit3, Plus, Trash2, GripVertical, Wand2, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import html2canvas from 'html2canvas';
import { itineraryService, Itinerary, ItineraryActivity, ItineraryPreferences } from '../services/itineraryService';

interface ItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripDestination: string;
  tripStartDate: string;
  tripEndDate: string;
}

const ItineraryModal: React.FC<ItineraryModalProps> = ({
  isOpen,
  onClose,
  tripDestination,
  tripStartDate,
  tripEndDate
}) => {
  const [step, setStep] = useState<'preferences' | 'itinerary'>('preferences');
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [editingActivity, setEditingActivity] = useState<{ dayIndex: number; activityIndex: number } | null>(null);
  const [showAddActivity, setShowAddActivity] = useState<number | null>(null);
  const [showApiKeyInfo, setShowApiKeyInfo] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [currentExportPage, setCurrentExportPage] = useState(0);
  const [totalExportPages, setTotalExportPages] = useState(1);
  const itineraryRef = useRef<HTMLDivElement>(null);
  const exportPreviewRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [preferences, setPreferences] = useState<ItineraryPreferences>({
    budget: 'mid-range',
    interests: [],
    travelStyle: 'moderate',
    groupSize: 2,
    specialRequests: ''
  });

  const interestOptions = [
    'Sightseeing', 'Food & Dining', 'Museums', 'Nature', 'Adventure', 'Shopping',
    'Nightlife', 'Culture', 'History', 'Art', 'Photography', 'Local Experiences'
  ];

  const categoryIcons = {
    sightseeing: '🏛️',
    dining: '🍽️',
    shopping: '🛍️',
    entertainment: '🎭',
    transport: '🚗',
    accommodation: '🏨',
    activity: '🎯'
  };

  const categoryColors = {
    sightseeing: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    dining: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
    shopping: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
    entertainment: 'bg-pink-500/20 border-pink-500/30 text-pink-400',
    transport: 'bg-green-500/20 border-green-500/30 text-green-400',
    accommodation: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    activity: 'bg-red-500/20 border-red-500/30 text-red-400'
  };

  useEffect(() => {
    if (itinerary) {
      // Calculate how many export pages we need based on the number of days
      const daysPerPage = 3;
      const pages = Math.ceil(itinerary.days.length / daysPerPage);
      setTotalExportPages(pages);
      
      // Initialize the refs array
      exportPreviewRefs.current = Array(pages).fill(null);
    }
  }, [itinerary]);

  if (!isOpen) return null;

  const handleGenerateItinerary = async () => {
    setLoading(true);
    setShowApiKeyInfo(false);
    
    try {
      const generatedItinerary = await itineraryService.generateItinerary(
        tripDestination,
        tripStartDate,
        tripEndDate,
        preferences
      );
      setItinerary(generatedItinerary);
      setStep('itinerary');
    } catch (error) {
      console.error('Error generating itinerary:', error);
      
      // Check if this is an API key issue
      if (error instanceof Error && error.message.includes('API_KEY_MISSING')) {
        setShowApiKeyInfo(true);
      }
      
      // Still generate a fallback itinerary
      try {
        const fallbackItinerary = await itineraryService.generateItinerary(
          tripDestination,
          tripStartDate,
          tripEndDate,
          preferences
        );
        setItinerary(fallbackItinerary);
        setStep('itinerary');
      } catch (fallbackError) {
        console.error('Fallback itinerary generation also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !itinerary) return;
    
    const { source, destination } = result;
    
    // Parse the droppableId to get day information
    const sourceDayIndex = parseInt(source.droppableId.split('-')[1]);
    const destinationDayIndex = parseInt(destination.droppableId.split('-')[1]);

    if (sourceDayIndex === destinationDayIndex) {
      // Reordering within the same day
      const updatedItinerary = itineraryService.reorderActivities(
        itinerary,
        sourceDayIndex,
        source.index,
        destination.index
      );
      setItinerary(updatedItinerary);
    } else {
      // Moving between different days
      const updatedItinerary = itineraryService.moveActivityBetweenDays(
        itinerary,
        sourceDayIndex,
        source.index,
        destinationDayIndex,
        destination.index
      );
      setItinerary(updatedItinerary);
    }
  };

  const handleUpdateActivity = (dayIndex: number, activityIndex: number, updates: Partial<ItineraryActivity>) => {
    if (!itinerary) return;
    
    const updatedItinerary = itineraryService.updateActivity(itinerary, dayIndex, activityIndex, updates);
    setItinerary(updatedItinerary);
    setEditingActivity(null);
  };

  const handleAddActivity = (dayIndex: number, activity: Omit<ItineraryActivity, 'id'>) => {
    if (!itinerary) return;
    
    const updatedItinerary = itineraryService.addActivity(itinerary, dayIndex, activity);
    setItinerary(updatedItinerary);
    setShowAddActivity(null);
  };

  const handleRemoveActivity = (dayIndex: number, activityIndex: number) => {
    if (!itinerary) return;
    
    const updatedItinerary = itineraryService.removeActivity(itinerary, dayIndex, activityIndex);
    setItinerary(updatedItinerary);
  };

  const exportAsImage = async () => {
    if (!itinerary) return;
    
    try {
      setExportLoading(true);
      
      // Create an array to store all the image data URLs
      const imageDataUrls: string[] = [];
      
      // Export each page
      for (let page = 0; page < totalExportPages; page++) {
        const exportPreview = exportPreviewRefs.current[page];
        if (!exportPreview) continue;
        
        // Make sure the export preview is visible during capture
        const originalDisplay = exportPreview.style.display;
        exportPreview.style.display = 'block';
        
        // Wait a moment for the DOM to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const canvas = await html2canvas(exportPreview, {
          scale: 2,
          backgroundColor: '#000000',
          useCORS: true,
          logging: false,
          allowTaint: true
        });
        
        // Reset display style
        exportPreview.style.display = originalDisplay;
        
        // Add the image data URL to our array
        imageDataUrls.push(canvas.toDataURL('image/png'));
      }
      
      // Download each image
      for (let i = 0; i < imageDataUrls.length; i++) {
        const link = document.createElement('a');
        const fileName = imageDataUrls.length > 1 
          ? `${tripDestination.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_itinerary_${i+1}.png`
          : `${tripDestination.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_itinerary.png`;
        
        link.download = fileName;
        link.href = imageDataUrls[i];
        link.click();
        
        // Add a small delay between downloads to prevent browser issues
        if (i < imageDataUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error('Error exporting images:', error);
      alert('Failed to export itinerary. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setPreferences(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="pixel-card max-w-6xl w-full max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'preferences' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-purple-500/20 mb-4">
                <Wand2 className="h-8 w-8 text-purple-500 animate-pulse" />
              </div>
              <h2 className="pixel-text text-2xl text-purple-400 mb-2">CREATE ITINERARY</h2>
              <p className="outfit-text text-gray-400">
                Let's create a personalized itinerary for {tripDestination}
              </p>
            </div>

            <div className="space-y-6">
              {/* Budget Selection */}
              <div>
                <label className="block pixel-text text-sm text-purple-400 mb-3">
                  💰 BUDGET PREFERENCE
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'budget', label: 'Budget', desc: 'Under $100/day' },
                    { value: 'mid-range', label: 'Mid-Range', desc: '$100-200/day' },
                    { value: 'luxury', label: 'Luxury', desc: '$200+/day' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setPreferences(prev => ({ ...prev, budget: option.value as any }))}
                      className={`p-4 border-2 transition-all text-center ${
                        preferences.budget === option.value
                          ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                          : 'border-gray-600 hover:border-purple-500/50 text-gray-300'
                      }`}
                    >
                      <div className="pixel-text text-sm mb-1">{option.label}</div>
                      <div className="outfit-text text-xs text-gray-400">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className="block pixel-text text-sm text-purple-400 mb-3">
                  🎯 INTERESTS (Select all that apply)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {interestOptions.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`p-3 border-2 transition-all text-sm ${
                        preferences.interests.includes(interest)
                          ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                          : 'border-gray-600 hover:border-purple-500/50 text-gray-300'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Travel Style */}
              <div>
                <label className="block pixel-text text-sm text-purple-400 mb-3">
                  ⚡ TRAVEL STYLE
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'relaxed', label: 'Relaxed', desc: 'Take it easy' },
                    { value: 'moderate', label: 'Moderate', desc: 'Balanced pace' },
                    { value: 'packed', label: 'Packed', desc: 'See everything' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setPreferences(prev => ({ ...prev, travelStyle: option.value as any }))}
                      className={`p-4 border-2 transition-all text-center ${
                        preferences.travelStyle === option.value
                          ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                          : 'border-gray-600 hover:border-purple-500/50 text-gray-300'
                      }`}
                    >
                      <div className="pixel-text text-sm mb-1">{option.label}</div>
                      <div className="outfit-text text-xs text-gray-400">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Group Size */}
              <div>
                <label className="block pixel-text text-sm text-purple-400 mb-3">
                  👥 GROUP SIZE
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={preferences.groupSize}
                  onChange={(e) => setPreferences(prev => ({ ...prev, groupSize: parseInt(e.target.value) || 1 }))}
                  className="w-full input-pixel"
                />
              </div>

              {/* Special Requests */}
              <div>
                <label className="block pixel-text text-sm text-purple-400 mb-3">
                  📝 SPECIAL REQUESTS (Optional)
                </label>
                <textarea
                  value={preferences.specialRequests}
                  onChange={(e) => setPreferences(prev => ({ ...prev, specialRequests: e.target.value }))}
                  placeholder="Any specific requirements, accessibility needs, or preferences..."
                  className="w-full input-pixel h-24 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                onClick={onClose}
                className="pixel-button-secondary flex-1"
              >
                CANCEL
              </button>
              <button
                onClick={handleGenerateItinerary}
                disabled={loading || preferences.interests.length === 0}
                className="pixel-button-primary flex-1 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    GENERATING...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    GENERATE ITINERARY
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'itinerary' && itinerary && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="pixel-text text-2xl text-purple-400 mb-2">YOUR ITINERARY</h2>
                <p className="outfit-text text-gray-400">
                  {itinerary.destination} • {itinerary.totalDays} days • {itinerary.estimatedBudget}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep('preferences')}
                  className="pixel-button-secondary text-sm px-3 py-1"
                >
                  EDIT PREFERENCES
                </button>
                <button
                  onClick={exportAsImage}
                  disabled={exportLoading}
                  className="pixel-button-primary text-sm px-3 py-1 flex items-center gap-1"
                >
                  {exportLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  EXPORT
                </button>
              </div>
            </div>

            {/* API Key Info Banner */}
            {showApiKeyInfo && (
              <div className="pixel-card bg-yellow-500/10 border-yellow-500/20 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="pixel-text text-yellow-400 text-sm mb-2">AI ITINERARY GENERATION UNAVAILABLE</h3>
                    <p className="outfit-text text-sm text-gray-300 mb-3">
                      The AI-powered itinerary generation requires a Gemini API key to be configured. 
                      Don't worry - we'll still create a great personalized itinerary for you using our fallback system!
                    </p>
                    <details className="outfit-text text-xs text-gray-400">
                      <summary className="cursor-pointer hover:text-gray-300 mb-2">Setup Instructions (for administrators)</summary>
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>Get a Gemini API key from Google AI Studio</li>
                        <li>Run: <code className="bg-gray-800 px-1 rounded">supabase secrets set GEMINI_API_KEY=your_api_key_here</code></li>
                        <li>Redeploy the edge function if needed</li>
                      </ol>
                    </details>
                  </div>
                </div>
              </div>
            )}

            {/* Export Preview - Hidden but used for export */}
            {Array.from({ length: totalExportPages }).map((_, pageIndex) => {
              // Calculate which days to show on this page
              const daysPerPage = 3;
              const startDayIndex = pageIndex * daysPerPage;
              const endDayIndex = Math.min(startDayIndex + daysPerPage, itinerary.days.length);
              const daysForThisPage = itinerary.days.slice(startDayIndex, endDayIndex);
              
              return (
                <div 
                  key={`export-preview-${pageIndex}`}
                  ref={el => exportPreviewRefs.current[pageIndex] = el}
                  className="hidden"
                  style={{ 
                    width: '1080px', 
                    height: '1080px', 
                    padding: '60px', 
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    fontFamily: 'Outfit, sans-serif'
                  }}
                >
                  <div className="text-center mb-8">
                    <h1 className="text-6xl font-bold text-white mb-4">{itinerary.destination}</h1>
                    <p className="text-3xl text-gray-300">
                      {itinerary.totalDays} Day Itinerary
                      {totalExportPages > 1 ? ` (Page ${pageIndex + 1}/${totalExportPages})` : ''}
                    </p>
                    <p className="text-2xl text-purple-400 mt-4">{itinerary.estimatedBudget}</p>
                  </div>
                  
                  <div className="space-y-6">
                    {daysForThisPage.map((day) => (
                      <div key={day.day} className="bg-gray-900 p-6 rounded-lg">
                        <h3 className="text-3xl font-bold text-purple-400 mb-4">Day {day.day}</h3>
                        <div className="space-y-3">
                          {day.activities.slice(0, 4).map((activity) => (
                            <div key={activity.id} className="flex items-center gap-4">
                              <span className="text-2xl">{categoryIcons[activity.category]}</span>
                              <div>
                                <div className="text-xl font-semibold text-white">{activity.name}</div>
                                <div className="text-lg text-gray-300">{activity.time} • {activity.location}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-center mt-8">
                    <p className="text-2xl text-gray-400">#TravelWithTrippit #Adventure</p>
                    <p className="text-xl text-purple-400 mt-2">Created with Trippit</p>
                  </div>
                </div>
              );
            })}

            {/* Itinerary Editor */}
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="space-y-6">
                {itinerary.days.map((day, dayIndex) => (
                  <div key={day.day} className="pixel-card bg-gray-800/50 border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-purple-400" />
                        <h3 className="pixel-text text-lg text-purple-400">
                          DAY {day.day} - {new Date(day.date).toLocaleDateString()}
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowAddActivity(dayIndex)}
                        className="pixel-button-secondary text-xs px-2 py-1 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        ADD
                      </button>
                    </div>

                    <Droppable droppableId={`day-${dayIndex}`}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="space-y-3"
                        >
                          {day.activities.map((activity, activityIndex) => (
                            <Draggable
                              key={activity.id}
                              draggableId={activity.id}
                              index={activityIndex}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`pixel-card bg-gray-900 border-gray-600 transition-all ${
                                    snapshot.isDragging ? 'shadow-lg scale-105' : ''
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing mt-1"
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-lg">{categoryIcons[activity.category]}</span>
                                          <span className={`pixel-text text-xs px-2 py-1 rounded ${categoryColors[activity.category]}`}>
                                            {activity.category}
                                          </span>
                                          <div className="flex items-center gap-1 text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            <span className="outfit-text text-xs">{activity.time}</span>
                                          </div>
                                          <div className="flex items-center gap-1 text-gray-400">
                                            <MapPin className="w-3 h-3" />
                                            <span className="outfit-text text-xs">{activity.location}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => setEditingActivity({ dayIndex, activityIndex })}
                                            className="text-blue-400 hover:text-blue-300 p-1"
                                          >
                                            <Edit3 className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => handleRemoveActivity(dayIndex, activityIndex)}
                                            className="text-red-400 hover:text-red-300 p-1"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>

                                      <h4 className="outfit-text font-semibold text-white mb-1 break-words">
                                        {activity.name}
                                      </h4>
                                      <p className="outfit-text text-sm text-gray-300 mb-2 break-words">
                                        {activity.description}
                                      </p>

                                      <div className="flex items-center gap-4 text-xs">
                                        <div className="flex items-center gap-1 text-green-400">
                                          <DollarSign className="w-3 h-3" />
                                          <span>{activity.estimatedCost}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-blue-400">
                                          <Clock className="w-3 h-3" />
                                          <span>{activity.duration}</span>
                                        </div>
                                      </div>

                                      {activity.tips && (
                                        <div className="mt-2 flex items-start gap-1 text-xs text-yellow-400">
                                          <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                          <span className="break-words">{activity.tips}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

                    {/* Add Activity Form */}
                    {showAddActivity === dayIndex && (
                      <div className="mt-4 pixel-card bg-gray-900 border-blue-500/20">
                        <h4 className="pixel-text text-blue-400 text-sm mb-3">ADD NEW ACTIVITY</h4>
                        <AddActivityForm
                          onAdd={(activity) => handleAddActivity(dayIndex, activity)}
                          onCancel={() => setShowAddActivity(null)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </DragDropContext>

            {/* Travel Tips */}
            {itinerary.travelTips.length > 0 && (
              <div className="pixel-card bg-yellow-500/10 border-yellow-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  <h3 className="pixel-text text-yellow-400">TRAVEL TIPS</h3>
                </div>
                <ul className="space-y-2">
                  {itinerary.travelTips.map((tip, index) => (
                    <li key={index} className="outfit-text text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">•</span>
                      <span className="break-words">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Edit Activity Modal */}
        {editingActivity && itinerary && (
          <EditActivityModal
            activity={itinerary.days[editingActivity.dayIndex].activities[editingActivity.activityIndex]}
            onSave={(updates) => handleUpdateActivity(editingActivity.dayIndex, editingActivity.activityIndex, updates)}
            onCancel={() => setEditingActivity(null)}
          />
        )}
      </div>
    </div>
  );
};

// Add Activity Form Component
const AddActivityForm: React.FC<{
  onAdd: (activity: Omit<ItineraryActivity, 'id'>) => void;
  onCancel: () => void;
}> = ({ onAdd, onCancel }) => {
  const [activity, setActivity] = useState<Omit<ItineraryActivity, 'id'>>({
    name: '',
    time: '',
    duration: '',
    location: '',
    description: '',
    category: 'activity',
    estimatedCost: '',
    tips: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activity.name && activity.time && activity.location) {
      onAdd(activity);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Activity name"
          value={activity.name}
          onChange={(e) => setActivity(prev => ({ ...prev, name: e.target.value }))}
          className="input-pixel text-sm"
          required
        />
        <input
          type="time"
          value={activity.time}
          onChange={(e) => setActivity(prev => ({ ...prev, time: e.target.value }))}
          className="input-pixel text-sm"
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Duration (e.g., 2 hours)"
          value={activity.duration}
          onChange={(e) => setActivity(prev => ({ ...prev, duration: e.target.value }))}
          className="input-pixel text-sm"
        />
        <select
          value={activity.category}
          onChange={(e) => setActivity(prev => ({ ...prev, category: e.target.value as any }))}
          className="input-pixel text-sm"
        >
          <option value="activity">Activity</option>
          <option value="sightseeing">Sightseeing</option>
          <option value="dining">Dining</option>
          <option value="shopping">Shopping</option>
          <option value="entertainment">Entertainment</option>
          <option value="transport">Transport</option>
        </select>
      </div>

      <input
        type="text"
        placeholder="Location"
        value={activity.location}
        onChange={(e) => setActivity(prev => ({ ...prev, location: e.target.value }))}
        className="w-full input-pixel text-sm"
        required
      />

      <textarea
        placeholder="Description"
        value={activity.description}
        onChange={(e) => setActivity(prev => ({ ...prev, description: e.target.value }))}
        className="w-full input-pixel text-sm h-16 resize-none"
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="pixel-button-secondary flex-1 text-sm"
        >
          CANCEL
        </button>
        <button
          type="submit"
          className="pixel-button-primary flex-1 text-sm"
        >
          ADD ACTIVITY
        </button>
      </div>
    </form>
  );
};

// Edit Activity Modal Component
const EditActivityModal: React.FC<{
  activity: ItineraryActivity;
  onSave: (updates: Partial<ItineraryActivity>) => void;
  onCancel: () => void;
}> = ({ activity, onSave, onCancel }) => {
  const [editedActivity, setEditedActivity] = useState(activity);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedActivity);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
      <div className="pixel-card max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="pixel-text text-blue-400">EDIT ACTIVITY</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={editedActivity.name}
            onChange={(e) => setEditedActivity(prev => ({ ...prev, name: e.target.value }))}
            className="w-full input-pixel text-sm"
            placeholder="Activity name"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="time"
              value={editedActivity.time}
              onChange={(e) => setEditedActivity(prev => ({ ...prev, time: e.target.value }))}
              className="input-pixel text-sm"
              required
            />
            <input
              type="text"
              value={editedActivity.duration}
              onChange={(e) => setEditedActivity(prev => ({ ...prev, duration: e.target.value }))}
              className="input-pixel text-sm"
              placeholder="Duration"
            />
          </div>

          <input
            type="text"
            value={editedActivity.location}
            onChange={(e) => setEditedActivity(prev => ({ ...prev, location: e.target.value }))}
            className="w-full input-pixel text-sm"
            placeholder="Location"
            required
          />

          <textarea
            value={editedActivity.description}
            onChange={(e) => setEditedActivity(prev => ({ ...prev, description: e.target.value }))}
            className="w-full input-pixel text-sm h-20 resize-none"
            placeholder="Description"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={editedActivity.category}
              onChange={(e) => setEditedActivity(prev => ({ ...prev, category: e.target.value as any }))}
              className="input-pixel text-sm"
            >
              <option value="activity">Activity</option>
              <option value="sightseeing">Sightseeing</option>
              <option value="dining">Dining</option>
              <option value="shopping">Shopping</option>
              <option value="entertainment">Entertainment</option>
              <option value="transport">Transport</option>
            </select>
            <input
              type="text"
              value={editedActivity.estimatedCost}
              onChange={(e) => setEditedActivity(prev => ({ ...prev, estimatedCost: e.target.value }))}
              className="input-pixel text-sm"
              placeholder="Cost"
            />
          </div>

          <textarea
            value={editedActivity.tips || ''}
            onChange={(e) => setEditedActivity(prev => ({ ...prev, tips: e.target.value }))}
            className="w-full input-pixel text-sm h-16 resize-none"
            placeholder="Tips (optional)"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="pixel-button-secondary flex-1"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="pixel-button-primary flex-1"
            >
              SAVE CHANGES
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItineraryModal;