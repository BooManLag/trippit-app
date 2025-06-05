import { ChecklistCategory } from '../types';

export const defaultChecklist: ChecklistCategory[] = [
  {
    id: 'documents',
    name: '📄 Documents',
    emoji: '📄',
    items: [
      {
        id: 'doc-1',
        category: '📄 Documents',
        description: 'Valid passport (check expiration date)',
        is_completed: false,
        is_default: true
      },
      {
        id: 'doc-2',
        category: '📄 Documents',
        description: 'Travel insurance documents',
        is_completed: false,
        is_default: true
      },
      {
        id: 'doc-3',
        category: '📄 Documents',
        description: 'Visa requirements checked',
        is_completed: false,
        is_default: true
      },
      {
        id: 'doc-4',
        category: '📄 Documents',
        description: 'Travel itinerary printed',
        is_completed: false,
        is_default: true
      }
    ]
  },
  {
    id: 'essentials',
    name: '🎒 Essentials',
    emoji: '🎒',
    items: [
      {
        id: 'ess-1',
        category: '🎒 Essentials',
        description: 'Phone and charger',
        is_completed: false,
        is_default: true
      },
      {
        id: 'ess-2',
        category: '🎒 Essentials',
        description: 'Power adapter for destination',
        is_completed: false,
        is_default: true
      },
      {
        id: 'ess-3',
        category: '🎒 Essentials',
        description: 'Basic first-aid kit',
        is_completed: false,
        is_default: true
      },
      {
        id: 'ess-4',
        category: '🎒 Essentials',
        description: 'Emergency contact list',
        is_completed: false,
        is_default: true
      }
    ]
  },
  {
    id: 'preparation',
    name: '✈️ Preparation',
    emoji: '✈️',
    items: [
      {
        id: 'prep-1',
        category: '✈️ Preparation',
        description: 'Check-in completed',
        is_completed: false,
        is_default: true
      },
      {
        id: 'prep-2',
        category: '✈️ Preparation',
        description: 'Local currency exchanged',
        is_completed: false,
        is_default: true
      },
      {
        id: 'prep-3',
        category: '✈️ Preparation',
        description: 'Download offline maps',
        is_completed: false,
        is_default: true
      },
      {
        id: 'prep-4',
        category: '✈️ Preparation',
        description: 'Learn basic local phrases',
        is_completed: false,
        is_default: true
      }
    ]
  },
  {
    id: 'health',
    name: '💊 Health & Safety',
    emoji: '💊',
    items: [
      {
        id: 'health-1',
        category: '💊 Health & Safety',
        description: 'Required vaccinations',
        is_completed: false,
        is_default: true
      },
      {
        id: 'health-2',
        category: '💊 Health & Safety',
        description: 'Personal medications',
        is_completed: false,
        is_default: true
      },
      {
        id: 'health-3',
        category: '💊 Health & Safety',
        description: 'Travel insurance coverage',
        is_completed: false,
        is_default: true
      },
      {
        id: 'health-4',
        category: '💊 Health & Safety',
        description: 'Emergency numbers saved',
        is_completed: false,
        is_default: true
      }
    ]
  }
];