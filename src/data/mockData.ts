import { Trip, Tip, Badge, Scenario, BucketListItem } from '../types';

export const mockTrips: Trip[] = [
  {
    id: '1',
    destination: 'Paris, France',
    startDate: '2025-06-10',
    endDate: '2025-06-17',
    userId: 'user1'
  }
];

export const mockTips: Tip[] = [
  {
    id: '1',
    category: 'Safety',
    content: 'Keep your passport in the hotel safe and carry a photocopy instead.',
    location: 'Global'
  },
  {
    id: '2',
    category: 'Budget',
    content: 'Exchange currency at banks rather than airports for better rates.',
    location: 'Global'
  },
  {
    id: '3',
    category: 'Language',
    content: 'Learn basic phrases like "hello," "thank you," and "where is the bathroom?"',
    location: 'Global'
  },
  {
    id: '4',
    category: 'Culture',
    content: 'In Japan, it\'s considered rude to eat while walking.',
    location: 'Japan'
  },
  {
    id: '5',
    category: 'Food',
    content: 'In Italy, cappuccino is only consumed before noon. Order an espresso after meals instead.',
    location: 'Italy'
  },
  {
    id: '6',
    category: 'Transport',
    content: 'In London, stand on the right side of escalators in the Tube to let people pass on the left.',
    location: 'London, UK'
  }
];

export const mockBadges: Badge[] = [
  {
    id: '1',
    name: 'First Timer',
    description: 'Created your first trip',
    icon: 'award',
    unlocked: true
  },
  {
    id: '2',
    name: 'Savvy Traveler',
    description: 'Completed 5 travel scenarios',
    icon: 'brain',
    unlocked: false
  },
  {
    id: '3',
    name: 'Bucket List Champion',
    description: 'Completed 10 bucket list items',
    icon: 'check-square',
    unlocked: false
  },
  {
    id: '4',
    name: 'Tip Collector',
    description: 'Saved 20 travel tips',
    icon: 'bookmark',
    unlocked: false
  }
];

export const mockScenarios: Scenario[] = [
  {
    id: '1',
    title: 'Lost Passport',
    description: 'You\'re enjoying your vacation in Barcelona when you realize your passport is missing! What do you do?',
    location: 'Barcelona, Spain',
    choices: [
      {
        id: '1a',
        text: 'Retrace your steps to find it',
        outcome: 'You spend hours looking but can\'t find it. You\'ve wasted valuable vacation time.'
      },
      {
        id: '1b',
        text: 'Contact your country\'s embassy immediately',
        outcome: 'Good choice! The embassy helps you get an emergency replacement passport within 24 hours.'
      },
      {
        id: '1c',
        text: 'Continue your trip and deal with it later',
        outcome: 'Bad idea! You can\'t leave the country without a passport and may face legal issues.'
      }
    ]
  },
  {
    id: '2',
    title: 'Unexpected Restaurant Bill',
    description: 'After a delicious meal in Paris, the bill is much higher than expected. The waiter explains there\'s a "tourist menu" price.',
    location: 'Paris, France',
    choices: [
      {
        id: '2a',
        text: 'Pay the bill to avoid conflict',
        outcome: 'You paid, but felt taken advantage of. Next time, confirm prices before ordering.'
      },
      {
        id: '2b',
        text: 'Refuse to pay the inflated price',
        outcome: 'The restaurant calls the police, creating a scene. You end up paying anyway plus dealing with authorities.'
      },
      {
        id: '2c',
        text: 'Politely ask to see the menu again and discuss the discrepancy',
        outcome: 'Smart move! The waiter adjusts the bill when you calmly point out the regular menu prices.'
      }
    ]
  }
];

export const mockBucketList: BucketListItem[] = [
  {
    id: '1',
    description: 'Watch the sunrise at the Eiffel Tower',
    location: 'Paris, France',
    completed: false
  },
  {
    id: '2',
    description: 'Eat authentic pasta in a local Italian restaurant',
    location: 'Italy',
    completed: true
  },
  {
    id: '3',
    description: 'Take a photo "holding up" the Leaning Tower of Pisa',
    location: 'Pisa, Italy',
    completed: false
  },
  {
    id: '4',
    description: 'Ride a gondola in Venice',
    location: 'Venice, Italy',
    completed: false
  }
];