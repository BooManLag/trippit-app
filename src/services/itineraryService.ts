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
    
    // Create a more personalized fallback based on user preferences
    const itineraryDays: ItineraryDay[] = [];
    const startDateObj = new Date(startDate);
    
    // Generate activities based on user interests
    const interestBasedActivities: {[key: string]: ItineraryActivity[]} = {
      'Sightseeing': [
        {
          id: 'sight-1',
          name: `Visit top attractions in ${destination}`,
          time: '10:00 AM',
          duration: '3 hours',
          location: 'City Center',
          description: `Explore the most famous landmarks and attractions in ${destination}.`,
          category: 'sightseeing',
          estimatedCost: preferences.budget === 'budget' ? '$0-20' : preferences.budget === 'luxury' ? '$50+' : '$20-50',
          tips: 'Consider getting a city pass for multiple attractions.'
        },
        {
          id: 'sight-2',
          name: 'Historical Walking Tour',
          time: '2:00 PM',
          duration: '2 hours',
          location: 'Historic District',
          description: `Discover the rich history of ${destination} with a guided or self-guided walking tour.`,
          category: 'sightseeing',
          estimatedCost: preferences.budget === 'budget' ? '$0-15' : preferences.budget === 'luxury' ? '$40+' : '$15-40',
          tips: 'Wear comfortable shoes and bring water.'
        }
      ],
      'Food & Dining': [
        {
          id: 'food-1',
          name: 'Local Cuisine Experience',
          time: '12:30 PM',
          duration: '1.5 hours',
          location: 'Local Restaurant District',
          description: `Taste authentic local dishes that ${destination} is famous for.`,
          category: 'dining',
          estimatedCost: preferences.budget === 'budget' ? '$10-20' : preferences.budget === 'luxury' ? '$50+' : '$20-50',
          tips: 'Ask locals for restaurant recommendations.'
        },
        {
          id: 'food-2',
          name: 'Food Market Visit',
          time: '10:00 AM',
          duration: '2 hours',
          location: 'Local Market',
          description: `Explore the vibrant food markets of ${destination} and sample local delicacies.`,
          category: 'dining',
          estimatedCost: preferences.budget === 'budget' ? '$5-15' : preferences.budget === 'luxury' ? '$30+' : '$15-30',
          tips: 'Go early for the freshest options.'
        }
      ],
      'Museums': [
        {
          id: 'museum-1',
          name: `Visit ${destination}'s Top Museum`,
          time: '10:00 AM',
          duration: '2.5 hours',
          location: 'Museum District',
          description: `Explore the cultural treasures and exhibits at the most renowned museum in ${destination}.`,
          category: 'sightseeing',
          estimatedCost: preferences.budget === 'budget' ? '$10-20' : preferences.budget === 'luxury' ? '$30+' : '$20-30',
          tips: 'Check for free admission days or discounts.'
        }
      ],
      'Nature': [
        {
          id: 'nature-1',
          name: `${destination} Park Exploration`,
          time: '9:00 AM',
          duration: '3 hours',
          location: 'City Park',
          description: `Enjoy the natural beauty of ${destination} with a relaxing walk through its most famous park.`,
          category: 'activity',
          estimatedCost: 'Free',
          tips: 'Bring a picnic to enjoy in the park.'
        },
        {
          id: 'nature-2',
          name: 'Scenic Viewpoint Visit',
          time: '4:00 PM',
          duration: '1.5 hours',
          location: 'Scenic Overlook',
          description: `Take in breathtaking views of ${destination} from a popular viewpoint.`,
          category: 'sightseeing',
          estimatedCost: preferences.budget === 'budget' ? '$0-5' : preferences.budget === 'luxury' ? '$20+' : '$5-20',
          tips: 'Visit during sunset for spectacular photos.'
        }
      ],
      'Adventure': [
        {
          id: 'adventure-1',
          name: 'Outdoor Adventure Activity',
          time: '9:00 AM',
          duration: '4 hours',
          location: 'Adventure Center',
          description: `Experience an exciting outdoor activity like hiking, biking, or water sports in ${destination}.`,
          category: 'activity',
          estimatedCost: preferences.budget === 'budget' ? '$20-40' : preferences.budget === 'luxury' ? '$100+' : '$40-100',
          tips: 'Book in advance and check weather conditions.'
        }
      ],
      'Shopping': [
        {
          id: 'shopping-1',
          name: 'Local Shopping Experience',
          time: '2:00 PM',
          duration: '2 hours',
          location: 'Shopping District',
          description: `Explore the best shopping areas in ${destination} for souvenirs and local products.`,
          category: 'shopping',
          estimatedCost: 'Varies',
          tips: 'Bargaining may be expected in some markets.'
        }
      ],
      'Nightlife': [
        {
          id: 'nightlife-1',
          name: 'Evening Entertainment',
          time: '8:00 PM',
          duration: '3 hours',
          location: 'Entertainment District',
          description: `Experience the vibrant nightlife of ${destination} with local music, drinks, or shows.`,
          category: 'entertainment',
          estimatedCost: preferences.budget === 'budget' ? '$15-30' : preferences.budget === 'luxury' ? '$100+' : '$30-100',
          tips: 'Research venues in advance for the best experience.'
        }
      ],
      'Culture': [
        {
          id: 'culture-1',
          name: 'Cultural Performance',
          time: '7:00 PM',
          duration: '2 hours',
          location: 'Cultural Center',
          description: `Attend a traditional performance showcasing the cultural heritage of ${destination}.`,
          category: 'entertainment',
          estimatedCost: preferences.budget === 'budget' ? '$15-30' : preferences.budget === 'luxury' ? '$80+' : '$30-80',
          tips: 'Book tickets in advance for popular shows.'
        }
      ],
      'History': [
        {
          id: 'history-1',
          name: 'Historical Site Tour',
          time: '10:00 AM',
          duration: '2.5 hours',
          location: 'Historical Site',
          description: `Explore the fascinating history of ${destination} at its most significant historical site.`,
          category: 'sightseeing',
          estimatedCost: preferences.budget === 'budget' ? '$10-20' : preferences.budget === 'luxury' ? '$40+' : '$20-40',
          tips: 'Consider hiring a guide for deeper insights.'
        }
      ],
      'Art': [
        {
          id: 'art-1',
          name: 'Art Gallery Visit',
          time: '1:00 PM',
          duration: '2 hours',
          location: 'Art District',
          description: `Admire local and international art at ${destination}'s premier art galleries.`,
          category: 'sightseeing',
          estimatedCost: preferences.budget === 'budget' ? '$5-15' : preferences.budget === 'luxury' ? '$30+' : '$15-30',
          tips: 'Check for special exhibitions or events.'
        }
      ],
      'Photography': [
        {
          id: 'photo-1',
          name: 'Photography Tour',
          time: '7:00 AM',
          duration: '3 hours',
          location: 'Scenic Locations',
          description: `Capture the most photogenic spots in ${destination} during optimal lighting conditions.`,
          category: 'activity',
          estimatedCost: preferences.budget === 'budget' ? '$0' : preferences.budget === 'luxury' ? '$50+' : '$20-50',
          tips: 'Early morning offers the best light and fewer crowds.'
        }
      ],
      'Local Experiences': [
        {
          id: 'local-1',
          name: 'Local Workshop or Class',
          time: '2:00 PM',
          duration: '2.5 hours',
          location: 'Local Workshop',
          description: `Participate in a hands-on workshop to learn a traditional craft or skill from ${destination}.`,
          category: 'activity',
          estimatedCost: preferences.budget === 'budget' ? '$20-40' : preferences.budget === 'luxury' ? '$80+' : '$40-80',
          tips: 'Book in advance as these experiences often have limited spots.'
        }
      ]
    };
    
    // Standard activities for all itineraries
    const standardActivities: {[key: string]: ItineraryActivity[]} = {
      'Arrival': [
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
        }
      ],
      'Accommodation': [
        {
          id: 'accommodation',
          name: 'Check-in to Accommodation',
          time: '3:00 PM',
          duration: '1 hour',
          location: `${destination} ${preferences.budget === 'budget' ? 'Hostel/Budget Hotel' : preferences.budget === 'luxury' ? 'Luxury Hotel' : 'Mid-range Hotel'}`,
          description: 'Get settled in your accommodation and freshen up',
          category: 'accommodation',
          estimatedCost: preferences.budget === 'budget' ? '$30-60' : preferences.budget === 'luxury' ? '$200+' : '$80-200',
          tips: 'Ask the front desk for local recommendations'
        }
      ],
      'Departure': [
        {
          id: 'departure',
          name: `Depart from ${destination}`,
          time: '11:00 AM',
          duration: '2 hours',
          location: 'Airport/Station',
          description: 'Check-out and departure',
          category: 'transport',
          estimatedCost: 'Included',
          tips: 'Allow extra time for unexpected delays'
        }
      ]
    };
    
    // Generate activities for each day based on preferences
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDateObj);
      currentDate.setDate(startDateObj.getDate() + i);
      const formattedDate = currentDate.toISOString().split('T')[0];
      
      const dayActivities: ItineraryActivity[] = [];
      
      // First day - add arrival
      if (i === 0) {
        dayActivities.push(...standardActivities['Arrival']);
      }
      
      // Last day - add departure
      if (i === days - 1) {
        dayActivities.push(...standardActivities['Departure']);
      } else {
        // Regular day - add activities based on interests
        const selectedInterests = preferences.interests.length > 0 ? 
          preferences.interests : ['Sightseeing', 'Food & Dining'];
        
        // Determine number of activities based on travel style
        const activitiesPerDay = preferences.travelStyle === 'relaxed' ? 3 : 
                                preferences.travelStyle === 'packed' ? 5 : 4;
        
        // Add activities from selected interests
        let addedActivities = 0;
        let attemptedInterests = [...selectedInterests];
        
        while (addedActivities < activitiesPerDay && attemptedInterests.length > 0) {
          // Pick a random interest from the remaining ones
          const randomIndex = Math.floor(Math.random() * attemptedInterests.length);
          const interest = attemptedInterests[randomIndex];
          
          // Get activities for this interest
          const activitiesForInterest = interestBasedActivities[interest];
          
          if (activitiesForInterest && activitiesForInterest.length > 0) {
            // Pick a random activity from this interest
            const randomActivityIndex = Math.floor(Math.random() * activitiesForInterest.length);
            const activity = activitiesForInterest[randomActivityIndex];
            
            // Add the activity with a unique ID
            dayActivities.push({
              ...activity,
              id: `day-${i}-${activity.id}-${addedActivities}`,
              // Adjust time based on position in the day
              time: this.getTimeForActivityPosition(addedActivities, activitiesPerDay)
            });
            
            addedActivities++;
            
            // Remove this activity from the options to avoid duplicates
            activitiesForInterest.splice(randomActivityIndex, 1);
            
            // If no more activities for this interest, remove it from the list
            if (activitiesForInterest.length === 0) {
              attemptedInterests.splice(randomIndex, 1);
            }
          } else {
            // No activities for this interest, remove it
            attemptedInterests.splice(randomIndex, 1);
          }
        }
        
        // If we still need more activities, add generic ones
        if (addedActivities < activitiesPerDay) {
          const genericActivities = [
            {
              id: `generic-${i}-1`,
              name: 'Explore Local Neighborhood',
              time: this.getTimeForActivityPosition(addedActivities, activitiesPerDay),
              duration: '2 hours',
              location: 'Local Area',
              description: `Take a leisurely stroll through a charming neighborhood in ${destination}.`,
              category: 'sightseeing' as const,
              estimatedCost: 'Free',
              tips: 'Ask locals for hidden gems in the area.'
            },
            {
              id: `generic-${i}-2`,
              name: 'Relax at a Local Cafe',
              time: this.getTimeForActivityPosition(addedActivities + 1, activitiesPerDay),
              duration: '1 hour',
              location: 'Cafe District',
              description: `Enjoy the local cafe culture and people-watching in ${destination}.`,
              category: 'dining' as const,
              estimatedCost: preferences.budget === 'budget' ? '$5-10' : preferences.budget === 'luxury' ? '$15+' : '$10-15',
              tips: 'Try the local specialty coffee or tea.'
            }
          ];
          
          // Add as many generic activities as needed
          for (let j = 0; j < activitiesPerDay - addedActivities && j < genericActivities.length; j++) {
            dayActivities.push(genericActivities[j]);
          }
        }
      }
      
      // Sort activities by time
      dayActivities.sort((a, b) => {
        const timeA = this.convertTimeToMinutes(a.time);
        const timeB = this.convertTimeToMinutes(b.time);
        return timeA - timeB;
      });
      
      // Add the day to the itinerary
      itineraryDays.push({
        day: i + 1,
        date: formattedDate,
        activities: dayActivities
      });
    }
    
    // Generate travel tips based on preferences
    const travelTips = this.generateTravelTips(destination, preferences);
    
    // Calculate estimated budget based on preferences
    const estimatedBudget = this.calculateEstimatedBudget(preferences, days);
    
    return {
      destination,
      startDate,
      endDate,
      totalDays: days,
      days: itineraryDays,
      estimatedBudget,
      travelTips
    };
  }
  
  private getTimeForActivityPosition(position: number, totalActivities: number): string {
    // Distribute activities throughout the day
    const startHour = 9; // 9 AM
    const endHour = 20; // 8 PM
    const availableHours = endHour - startHour;
    const hourIncrement = availableHours / (totalActivities + 1);
    
    const activityHour = startHour + hourIncrement * (position + 1);
    const hour = Math.floor(activityHour);
    const minute = Math.round((activityHour - hour) * 60);
    
    // Format as 12-hour time
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
  }
  
  private convertTimeToMinutes(timeString: string): number {
    const [time, period] = timeString.split(' ');
    const [hourStr, minuteStr] = time.split(':');
    
    let hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);
    
    // Convert to 24-hour format
    if (period === 'PM' && hour < 12) {
      hour += 12;
    } else if (period === 'AM' && hour === 12) {
      hour = 0;
    }
    
    return hour * 60 + minute;
  }
  
  private generateTravelTips(destination: string, preferences: ItineraryPreferences): string[] {
    const tips = [
      `Research local customs and etiquette before visiting ${destination}.`,
      'Keep digital and physical copies of important documents.',
      'Download offline maps for navigation without internet.',
      'Learn a few basic phrases in the local language.',
      'Check if your credit/debit cards work at your destination.'
    ];
    
    // Add budget-specific tips
    if (preferences.budget === 'budget') {
      tips.push(
        'Look for free walking tours and museum days.',
        'Consider staying at hostels or budget accommodations.',
        'Shop at local markets and eat where locals eat for better prices.',
        'Use public transportation instead of taxis.'
      );
    } else if (preferences.budget === 'luxury') {
      tips.push(
        'Book restaurant reservations in advance for fine dining experiences.',
        'Consider hiring a local guide for personalized experiences.',
        'Look into VIP access options for popular attractions.',
        'Research exclusive experiences unique to the destination.'
      );
    }
    
    // Add interest-specific tips
    if (preferences.interests.includes('Food & Dining')) {
      tips.push('Research local specialties and must-try dishes before your trip.');
    }
    
    if (preferences.interests.includes('Photography')) {
      tips.push('Research the best photo spots and optimal times for lighting.');
    }
    
    if (preferences.interests.includes('Nature')) {
      tips.push('Check weather forecasts and pack appropriate outdoor gear.');
    }
    
    // Add group size tips
    if (preferences.groupSize > 4) {
      tips.push(
        'Make reservations in advance for larger groups.',
        'Consider splitting into smaller groups for some activities.'
      );
    }
    
    // Shuffle and return a subset of tips
    return this.shuffleArray(tips).slice(0, 5);
  }
  
  private calculateEstimatedBudget(preferences: ItineraryPreferences, days: number): string {
    let dailyBudget: string;
    
    switch (preferences.budget) {
      case 'budget':
        dailyBudget = `$${50 * preferences.groupSize}-${100 * preferences.groupSize}`;
        break;
      case 'luxury':
        dailyBudget = `$${200 * preferences.groupSize}+`;
        break;
      default: // mid-range
        dailyBudget = `$${100 * preferences.groupSize}-${200 * preferences.groupSize}`;
    }
    
    return `${dailyBudget} per day (${days} days total)`;
  }
  
  private shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
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