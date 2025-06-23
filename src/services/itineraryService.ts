import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ItineraryActivity {
  id: string;
  name: string;
  time: string;
  duration: string;
  location: string;
  description: string;
  category: 'sightseeing' | 'dining' | 'shopping' | 'entertainment' | 'transport' | 'accommodation' | 'activity';
  estimatedCost: string;
  tips?: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  activities: ItineraryActivity[];
}

export interface Itinerary {
  destination: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  days: ItineraryDay[];
  estimatedBudget: string;
  travelTips: string[];
}

export interface ItineraryPreferences {
  budget: 'budget' | 'mid-range' | 'luxury';
  interests: string[];
  travelStyle: 'relaxed' | 'moderate' | 'packed';
  groupSize: number;
  specialRequests?: string;
}

class ItineraryService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async generateItinerary(
    destination: string,
    startDate: string,
    endDate: string,
    preferences: ItineraryPreferences
  ): Promise<Itinerary> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your environment variables.');
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = this.buildPrompt(destination, startDate, endDate, preferences);

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const itineraryData = JSON.parse(jsonMatch[0]);
      
      // Validate and format the response
      return this.formatItinerary(itineraryData, destination, startDate, endDate);
    } catch (error) {
      console.error('Error generating itinerary:', error);
      
      // Fallback to sample itinerary if API fails
      return this.generateFallbackItinerary(destination, startDate, endDate, preferences);
    }
  }

  private buildPrompt(
    destination: string,
    startDate: string,
    endDate: string,
    preferences: ItineraryPreferences
  ): string {
    const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return `
Generate a detailed ${days}-day travel itinerary for ${destination} from ${startDate} to ${endDate}.

Preferences:
- Budget: ${preferences.budget}
- Interests: ${preferences.interests.join(', ')}
- Travel Style: ${preferences.travelStyle}
- Group Size: ${preferences.groupSize}
${preferences.specialRequests ? `- Special Requests: ${preferences.specialRequests}` : ''}

Please return ONLY a valid JSON object with this exact structure:
{
  "destination": "${destination}",
  "startDate": "${startDate}",
  "endDate": "${endDate}",
  "totalDays": ${days},
  "days": [
    {
      "day": 1,
      "date": "${startDate}",
      "activities": [
        {
          "id": "unique-id",
          "name": "Activity Name",
          "time": "9:00 AM",
          "duration": "2 hours",
          "location": "Specific location",
          "description": "Brief description",
          "category": "sightseeing",
          "estimatedCost": "$20-30",
          "tips": "Helpful tip"
        }
      ]
    }
  ],
  "estimatedBudget": "Total estimated budget",
  "travelTips": ["Tip 1", "Tip 2", "Tip 3"]
}

Categories should be one of: sightseeing, dining, shopping, entertainment, transport, accommodation, activity

Make the itinerary realistic, well-timed, and include a good mix of activities. Include specific locations, realistic time estimates, and practical tips.
`;
  }

  private formatItinerary(data: any, destination: string, startDate: string, endDate: string): Itinerary {
    // Ensure all activities have unique IDs
    const formattedDays = data.days?.map((day: any, dayIndex: number) => ({
      ...day,
      activities: day.activities?.map((activity: any, activityIndex: number) => ({
        ...activity,
        id: activity.id || `day-${dayIndex}-activity-${activityIndex}`,
        category: activity.category || 'activity',
        estimatedCost: activity.estimatedCost || 'Free',
        tips: activity.tips || ''
      })) || []
    })) || [];

    return {
      destination: data.destination || destination,
      startDate: data.startDate || startDate,
      endDate: data.endDate || endDate,
      totalDays: data.totalDays || formattedDays.length,
      days: formattedDays,
      estimatedBudget: data.estimatedBudget || 'Budget not specified',
      travelTips: data.travelTips || []
    };
  }

  private generateFallbackItinerary(
    destination: string,
    startDate: string,
    endDate: string,
    preferences: ItineraryPreferences
  ): Itinerary {
    const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const sampleActivities: ItineraryActivity[] = [
      {
        id: 'arrival',
        name: `Arrive in ${destination}`,
        time: '10:00 AM',
        duration: '2 hours',
        location: 'Airport/Station',
        description: 'Arrival and check-in to accommodation',
        category: 'transport',
        estimatedCost: 'Included',
        tips: 'Keep important documents handy'
      },
      {
        id: 'city-tour',
        name: 'City Walking Tour',
        time: '2:00 PM',
        duration: '3 hours',
        location: 'City Center',
        description: 'Explore the main attractions and get oriented',
        category: 'sightseeing',
        estimatedCost: '$15-25',
        tips: 'Wear comfortable walking shoes'
      },
      {
        id: 'local-dinner',
        name: 'Traditional Local Dinner',
        time: '7:00 PM',
        duration: '2 hours',
        location: 'Local Restaurant',
        description: 'Experience authentic local cuisine',
        category: 'dining',
        estimatedCost: '$25-40',
        tips: 'Try the local specialties'
      }
    ];

    const itineraryDays: ItineraryDay[] = [];
    const startDateObj = new Date(startDate);

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDateObj);
      currentDate.setDate(startDateObj.getDate() + i);
      
      itineraryDays.push({
        day: i + 1,
        date: currentDate.toISOString().split('T')[0],
        activities: sampleActivities.map((activity, index) => ({
          ...activity,
          id: `day-${i}-${activity.id}-${index}`,
          name: i === 0 ? activity.name : `Day ${i + 1} - ${activity.name}`
        }))
      });
    }

    return {
      destination,
      startDate,
      endDate,
      totalDays: days,
      days: itineraryDays,
      estimatedBudget: preferences.budget === 'budget' ? '$50-100/day' : preferences.budget === 'luxury' ? '$200-500/day' : '$100-200/day',
      travelTips: [
        'Book accommodations in advance',
        'Keep copies of important documents',
        'Learn basic local phrases',
        'Check weather forecast and pack accordingly'
      ]
    };
  }

  reorderActivities(itinerary: Itinerary, dayIndex: number, sourceIndex: number, destinationIndex: number): Itinerary {
    const newItinerary = { ...itinerary };
    const day = { ...newItinerary.days[dayIndex] };
    const activities = [...day.activities];
    
    const [removed] = activities.splice(sourceIndex, 1);
    activities.splice(destinationIndex, 0, removed);
    
    day.activities = activities;
    newItinerary.days[dayIndex] = day;
    
    return newItinerary;
  }

  moveActivityBetweenDays(
    itinerary: Itinerary,
    sourceDayIndex: number,
    sourceActivityIndex: number,
    destinationDayIndex: number,
    destinationActivityIndex: number
  ): Itinerary {
    const newItinerary = { ...itinerary };
    const sourceDay = { ...newItinerary.days[sourceDayIndex] };
    const destinationDay = { ...newItinerary.days[destinationDayIndex] };
    
    const sourceActivities = [...sourceDay.activities];
    const destinationActivities = [...destinationDay.activities];
    
    const [movedActivity] = sourceActivities.splice(sourceActivityIndex, 1);
    destinationActivities.splice(destinationActivityIndex, 0, movedActivity);
    
    sourceDay.activities = sourceActivities;
    destinationDay.activities = destinationActivities;
    
    newItinerary.days[sourceDayIndex] = sourceDay;
    newItinerary.days[destinationDayIndex] = destinationDay;
    
    return newItinerary;
  }

  updateActivity(itinerary: Itinerary, dayIndex: number, activityIndex: number, updatedActivity: Partial<ItineraryActivity>): Itinerary {
    const newItinerary = { ...itinerary };
    const day = { ...newItinerary.days[dayIndex] };
    const activities = [...day.activities];
    
    activities[activityIndex] = { ...activities[activityIndex], ...updatedActivity };
    
    day.activities = activities;
    newItinerary.days[dayIndex] = day;
    
    return newItinerary;
  }

  addActivity(itinerary: Itinerary, dayIndex: number, activity: Omit<ItineraryActivity, 'id'>): Itinerary {
    const newItinerary = { ...itinerary };
    const day = { ...newItinerary.days[dayIndex] };
    const activities = [...day.activities];
    
    const newActivity: ItineraryActivity = {
      ...activity,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    activities.push(newActivity);
    
    day.activities = activities;
    newItinerary.days[dayIndex] = day;
    
    return newItinerary;
  }

  removeActivity(itinerary: Itinerary, dayIndex: number, activityIndex: number): Itinerary {
    const newItinerary = { ...itinerary };
    const day = { ...newItinerary.days[dayIndex] };
    const activities = [...day.activities];
    
    activities.splice(activityIndex, 1);
    
    day.activities = activities;
    newItinerary.days[dayIndex] = day;
    
    return newItinerary;
  }
}

export const itineraryService = new ItineraryService();