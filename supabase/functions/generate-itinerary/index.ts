import { gemini15Flash, googleAI } from "npm:@genkit-ai/googleai@0.9.0";
import { genkit } from "npm:genkit@0.9.0";

interface ItineraryActivity {
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

interface ItineraryDay {
  day: number;
  date: string;
  activities: ItineraryActivity[];
}

interface Itinerary {
  destination: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  days: ItineraryDay[];
  estimatedBudget: string;
  travelTips: string[];
}

interface ItineraryPreferences {
  budget: 'budget' | 'mid-range' | 'luxury';
  interests: string[];
  travelStyle: 'relaxed' | 'moderate' | 'packed';
  groupSize: number;
  specialRequests?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const { destination, startDate, endDate, preferences } = await req.json();

    // Initialize Genkit with Google AI
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable not set");
    }

    const ai = genkit({
      plugins: [googleAI({ apiKey })],
      model: gemini15Flash,
    });

    const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const prompt = `
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

    const { text } = await ai.generate(prompt);

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const itineraryData = JSON.parse(jsonMatch[0]);
    
    // Validate and format the response
    const formattedDays = itineraryData.days?.map((day: any, dayIndex: number) => ({
      ...day,
      activities: day.activities?.map((activity: any, activityIndex: number) => ({
        ...activity,
        id: activity.id || `day-${dayIndex}-activity-${activityIndex}`,
        category: activity.category || 'activity',
        estimatedCost: activity.estimatedCost || 'Free',
        tips: activity.tips || ''
      })) || []
    })) || [];

    const formattedItinerary: Itinerary = {
      destination: itineraryData.destination || destination,
      startDate: itineraryData.startDate || startDate,
      endDate: itineraryData.endDate || endDate,
      totalDays: itineraryData.totalDays || formattedDays.length,
      days: formattedDays,
      estimatedBudget: itineraryData.estimatedBudget || 'Budget not specified',
      travelTips: itineraryData.travelTips || []
    };

    return new Response(
      JSON.stringify(formattedItinerary),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Error generating itinerary:', error);
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to generate itinerary",
        message: error.message 
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});