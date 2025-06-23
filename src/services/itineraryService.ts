import { gemini15Flash, googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

// Define the ItineraryService class with Genkit integration
class ItineraryService {
  private ai: any;

  constructor() {
    // Configure the Genkit instance with the Gemini model
    this.ai = genkit({
      plugins: [googleAI()],
      model: gemini15Flash, // Using Gemini Flash as the default model
    });
  }

  async generateItinerary(
    destination: string,
    startDate: string,
    endDate: string,
    preferences: ItineraryPreferences
  ): Promise<Itinerary> {
    const prompt = this.buildPrompt(destination, startDate, endDate, preferences);

    try {
      // Request to generate the itinerary from Gemini via Genkit
      const { text } = await this.ai.generate(prompt);

      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const itineraryData = JSON.parse(jsonMatch[0]);

      // Validate and format the itinerary data
      return this.formatItinerary(itineraryData, destination, startDate, endDate);
    } catch (error) {
      console.error('Error generating itinerary:', error);
      
      // Fallback in case of an error (e.g., API failure)
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
    `;
  }

  private formatItinerary(data: any, destination: string, startDate: string, endDate: string): Itinerary {
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
    // Fallback itinerary (sample data) if the API call fails
    const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    // Sample data and formatting for fallback itinerary
    const sampleActivities: ItineraryActivity[] = [/* Sample activities here */];
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
}
