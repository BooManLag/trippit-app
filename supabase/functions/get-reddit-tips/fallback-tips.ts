export interface FallbackTip {
  id: string;
  category: string;
  title: string;
  content: string;
  source: string;
  reddit_url: string;
  score: number;
  created_at: string;
  relevance_score: number;
}

export function generateFallbackTips(city: string, country: string): FallbackTip[] {
  const fallbackTips: FallbackTip[] = [
    {
      id: `fallback_${city}_1`,
      category: 'Planning',
      title: `Essential planning for ${city}`,
      content: `Research ${city} thoroughly before your trip. Check visa requirements, local customs, weather patterns, and book accommodations in advance. Create a flexible itinerary that allows for spontaneous discoveries.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 15,
      created_at: new Date().toISOString(),
      relevance_score: 50
    },
    {
      id: `fallback_${city}_2`,
      category: 'Budget',
      title: `Smart money management in ${city}`,
      content: `Research typical costs in ${city} and set a realistic budget. Notify your bank of travel plans, get local currency, and understand tipping customs. Consider using travel-friendly credit cards with no foreign fees.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 12,
      created_at: new Date().toISOString(),
      relevance_score: 45
    },
    {
      id: `fallback_${city}_3`,
      category: 'Safety',
      title: `Stay safe and secure in ${city}`,
      content: `Keep copies of important documents, stay aware of your surroundings, and research common scams in ${country}. Trust your instincts, avoid displaying expensive items, and know emergency contact numbers.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 18,
      created_at: new Date().toISOString(),
      relevance_score: 48
    },
    {
      id: `fallback_${city}_4`,
      category: 'Culture',
      title: `Cultural etiquette and customs in ${city}`,
      content: `Learn basic greetings, cultural norms, and social etiquette for ${city}. Understanding local customs will enhance your travel experience and help you connect with locals. Research dress codes for religious sites.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 14,
      created_at: new Date().toISOString(),
      relevance_score: 42
    },
    {
      id: `fallback_${city}_5`,
      category: 'Transport',
      title: `Getting around ${city} efficiently`,
      content: `Research public transportation options in ${city}. Download local transport apps, consider getting a transit card, and learn about ride-sharing services. Walking is often the best way to explore city centers.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 10,
      created_at: new Date().toISOString(),
      relevance_score: 38
    },
    {
      id: `fallback_${city}_6`,
      category: 'Food',
      title: `Culinary adventures in ${city}`,
      content: `Try authentic local dishes and visit traditional markets in ${city}. Ask locals for restaurant recommendations to discover hidden gems. Be adventurous but mindful of food safety, especially with street food.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 13,
      created_at: new Date().toISOString(),
      relevance_score: 40
    },
    {
      id: `fallback_${city}_7`,
      category: 'Things to Do',
      title: `Must-see attractions and hidden gems in ${city}`,
      content: `Visit the top landmarks and attractions in ${city}, but also explore off-the-beaten-path locations. Consider booking tickets in advance for popular sites. Mix tourist attractions with local experiences.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 11,
      created_at: new Date().toISOString(),
      relevance_score: 35
    },
    {
      id: `fallback_${city}_8`,
      category: 'Accommodation',
      title: `Choosing the right place to stay in ${city}`,
      content: `Select accommodation in ${city} based on your budget, preferred location, and travel style. Read recent reviews, check proximity to public transport, and consider the neighborhood's safety and amenities.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 8,
      created_at: new Date().toISOString(),
      relevance_score: 32
    },
    {
      id: `fallback_${city}_9`,
      category: 'Technology',
      title: `Stay connected and navigate ${city}`,
      content: `Get a local SIM card or international roaming plan for ${city}. Download essential apps: offline maps, translation tools, local transport apps, and currency converters. Backup important documents digitally.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 9,
      created_at: new Date().toISOString(),
      relevance_score: 30
    },
    {
      id: `fallback_${city}_10`,
      category: 'Weather',
      title: `Weather preparation for ${city}`,
      content: `Check the weather forecast for ${city} and pack accordingly. Consider the season, any special weather conditions in ${country}, and pack layers. Don't forget rain gear and comfortable walking shoes.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 7,
      created_at: new Date().toISOString(),
      relevance_score: 28
    },
    {
      id: `fallback_${city}_11`,
      category: 'Health',
      title: `Health and wellness in ${city}`,
      content: `Check if you need any vaccinations for ${country}. Pack a basic first-aid kit and any prescription medications. Research local healthcare options and consider travel insurance that covers medical emergencies.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 16,
      created_at: new Date().toISOString(),
      relevance_score: 44
    },
    {
      id: `fallback_${city}_12`,
      category: 'Documents',
      title: `Essential documents for ${city}`,
      content: `Ensure your passport is valid for at least 6 months. Check visa requirements for ${country}. Make copies of important documents and store them separately. Consider digital backups in cloud storage.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 20,
      created_at: new Date().toISOString(),
      relevance_score: 52
    },
    {
      id: `fallback_${city}_13`,
      category: 'Packing',
      title: `Smart packing for ${city}`,
      content: `Pack light and smart for ${city}. Bring versatile clothing suitable for the climate in ${country}. Don't forget essentials like adapters, chargers, and any specific items you might not find locally.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 6,
      created_at: new Date().toISOString(),
      relevance_score: 26
    },
    {
      id: `fallback_${city}_14`,
      category: 'Local Life',
      title: `Experience ${city} like a local`,
      content: `Venture beyond tourist areas to experience authentic ${city}. Use local transportation, shop at neighborhood markets, and try to interact with locals. Learn a few phrases in the local language.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 17,
      created_at: new Date().toISOString(),
      relevance_score: 46
    },
    {
      id: `fallback_${city}_15`,
      category: 'Mindset',
      title: `Travel mindset for ${city}`,
      content: `Approach your trip to ${city} with an open mind and flexible expectations. Embrace unexpected experiences, be patient with cultural differences, and remember that travel challenges often become the best stories.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 19,
      created_at: new Date().toISOString(),
      relevance_score: 41
    }
  ];

  console.log(`🆘 Generated ${fallbackTips.length} comprehensive fallback tips for ${city}, ${country}`);
  return fallbackTips;
}

// Additional specialized fallback tips for specific regions
export function generateRegionalFallbackTips(city: string, country: string): FallbackTip[] {
  const countryLower = country.toLowerCase();
  const regionalTips: FallbackTip[] = [];

  // European-specific tips
  if (['france', 'germany', 'italy', 'spain', 'netherlands', 'belgium', 'switzerland', 'austria', 'portugal', 'united kingdom', 'uk', 'england', 'scotland', 'wales'].includes(countryLower)) {
    regionalTips.push({
      id: `regional_${city}_eu_1`,
      category: 'Transport',
      title: `European transport tips for ${city}`,
      content: `In ${city}, consider getting a city transport pass for unlimited travel. European cities have excellent public transport. Validate tickets before boarding and keep them until you exit.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 15,
      created_at: new Date().toISOString(),
      relevance_score: 45
    });
  }

  // Asian-specific tips
  if (['japan', 'china', 'south korea', 'thailand', 'vietnam', 'singapore', 'malaysia', 'indonesia', 'philippines'].includes(countryLower)) {
    regionalTips.push({
      id: `regional_${city}_asia_1`,
      category: 'Culture',
      title: `Asian cultural etiquette in ${city}`,
      content: `In ${city}, respect local customs like removing shoes, bowing appropriately, and understanding hierarchy. Learn basic greetings and always be polite and patient.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 18,
      created_at: new Date().toISOString(),
      relevance_score: 48
    });
  }

  // American-specific tips
  if (['united states', 'usa', 'america', 'canada', 'mexico'].includes(countryLower)) {
    regionalTips.push({
      id: `regional_${city}_americas_1`,
      category: 'Budget',
      title: `Tipping culture in ${city}`,
      content: `In ${city}, tipping is expected in restaurants (15-20%), for taxi drivers, and hotel staff. Factor this into your budget when dining out or using services.`,
      source: 'Trippit',
      reddit_url: '#',
      score: 12,
      created_at: new Date().toISOString(),
      relevance_score: 40
    });
  }

  return regionalTips;
}