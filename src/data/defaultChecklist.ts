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
        isCompleted: false,
        isDefault: true
      },
      {
        id: 'doc-2',
        category: '📄 Documents',
        description: 'Travel insurance documents',
        isCompleted: false,
        isDefault: true
      },
      {
        id: 'doc-3',
        category: '📄 Documents',
        description: 'Visa requirements checked',
        isCompleted: false,
        isDefault: true
      },
      {
        id: 'doc-4',
        category: '📄 Documents',
        description: 'Travel itinerary printed',
        isCompleted: false,
        isDefault: true
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
        isCompleted: false,
        isDefault: true
      },
      {
        id: 'ess-2',
        category: '🎒 Essentials',
        description: 'Power adapter for destination',
        isCompleted: false,
        isDefault: true
      },
      {
        id: 'ess-3',
        category: '🎒 Essentials',
        description: 'Basic first-aid kit',
        isCompleted: false,
        isDefault: true
      },
      {
        id: 'ess-4',
        category: '🎒 Essentials',
        description: 'Emergency contact list',
        isCompleted: false,
        isDefault: true
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
        isCompleted: false,
        isDefault: true
      },
      {
        id: 'prep-2',
        category: '✈️ Preparation',
        description: 'Local currency exchanged',
        isCompleted: false,
        isDefault: true
      },
      {
        id: 'prep-3',
        category: '✈️ Preparation',
        description: 'Download offline maps',
        isCompleted: false,
        isDefault: true
      },
      {
        id: 'prep-4',
        category: '✈️ Preparation',
        description: 'Learn basic local phrases',
        isCompleted: false,
        isDefault: true
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
        isCompleted: false,
        isDefault: true
      },
      {
        id: 'health-2',
        category: '💊 Health & Safety',
        description: 'Personal medications',
        isCompleted: false,
        isDefault: true
      },
      {
        id: 'health-3',
        category: '💊 Health & Safety',
        description: 'Travel insurance coverage',
        isCompleted: false,
        isDefault: true
      },
      {
        id: 'health-4',
        category: '💊 Health & Safety',
        description: 'Emergency numbers saved',
        isCompleted: false,
        isDefault: true
      }
    ]
  }
];