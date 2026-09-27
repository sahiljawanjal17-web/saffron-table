import { NavGroup } from '@/types';

export const navGroups: NavGroup[] = [
  {
    label: 'Service',
    items: [
      { title: 'Overview', url: '/dashboard/overview', icon: 'dashboard', shortcut: ['d', 'd'], items: [] },
      { title: 'Orders & POS', url: '/dashboard/orders', icon: 'billing', shortcut: ['o', 'o'], items: [] },
      { title: 'Reservations', url: '/dashboard/reservations', icon: 'calendar', shortcut: ['r', 'r'], items: [] }
    ]
  },
  {
    label: 'Kitchen',
    items: [
      { title: 'Daily Stock', url: '/dashboard/stock', icon: 'product', shortcut: ['s', 's'], items: [] },
      { title: 'Menu', url: '/dashboard/menu', icon: 'pizza', shortcut: ['m', 'e'], items: [] }
    ]
  },
  {
    label: 'Business',
    items: [
      { title: 'Staff', url: '/dashboard/staff', icon: 'teams', shortcut: ['t', 's'], items: [] },
      { title: 'Finance', url: '/dashboard/finance', icon: 'creditCard', shortcut: ['f', 'f'], items: [] },
      { title: 'Reports', url: '/dashboard/reports', icon: 'page', shortcut: ['e', 'd'], items: [] }
    ]
  },
  {
    label: 'Intelligence',
    items: [
      { title: 'AI Insights', url: '/dashboard/insights', icon: 'trendingUp', shortcut: ['a', 'i'], items: [] },
      { title: 'AI Assistant', url: '/dashboard/assistant', icon: 'sparkles', shortcut: ['a', 'a'], items: [] },
      { title: 'Settings', url: '/dashboard/settings', icon: 'settings', shortcut: ['g', 's'], items: [] }
    ]
  }
];
