import {
  LayoutDashboard,
  Package,
  Layers,
  Users,
  RefreshCw,
  FileText,
  CreditCard,
  FileSpreadsheet,
  Receipt,
  Tag,
  Compass,
  User,
} from 'lucide-react';

export const navItems = [
  // --- Administration & Staff Deck ---
  {
    path: '/dashboard',
    label: 'Dashboard',
    bay: 'BAY 01',
    icon: LayoutDashboard,
    roles: ['admin', 'staff'],
  },
  {
    path: '/products',
    label: 'Products & Variants',
    bay: 'BAY 02',
    icon: Package,
    roles: ['admin', 'staff'],
  },
  {
    path: '/plans',
    label: 'Plans',
    bay: 'BAY 03',
    icon: Layers,
    roles: ['admin', 'staff'],
  },
  {
    path: '/customers',
    label: 'Customers',
    bay: 'BAY 04',
    icon: Users,
    roles: ['admin', 'staff'],
  },

  // Person 4 Modules (Staff / Admin)
  {
    path: '/subscriptions',
    label: 'Subscriptions',
    bay: 'BAY 05',
    icon: RefreshCw,
    roles: ['admin', 'staff'],
  },
  {
    path: '/invoices',
    label: 'Invoices',
    bay: 'BAY 06',
    icon: FileText,
    roles: ['admin', 'staff'],
  },
  {
    path: '/payments',
    label: 'Payments',
    bay: 'BAY 07',
    icon: CreditCard,
    roles: ['admin', 'staff'],
  },
  {
    path: '/quotations',
    label: 'Quotations',
    bay: 'BAY 08',
    icon: FileSpreadsheet,
    roles: ['admin', 'staff'],
  },
  {
    path: '/taxes',
    label: 'Taxes',
    bay: 'BAY 09',
    icon: Receipt,
    roles: ['admin'],
  },
  {
    path: '/discounts',
    label: 'Discounts',
    bay: 'BAY 10',
    icon: Tag,
    roles: ['admin'],
  },

  // --- Customer Portal Deck ---
  {
    path: '/portal',
    label: 'Customer Portal',
    bay: 'PORTAL 01',
    icon: Compass,
    roles: ['customer'],
  },
  {
    path: '/portal/subscriptions',
    label: 'My Subscriptions',
    bay: 'PORTAL 02',
    icon: RefreshCw,
    roles: ['customer'],
  },
  {
    path: '/portal/invoices',
    label: 'My Invoices',
    bay: 'PORTAL 03',
    icon: FileText,
    roles: ['customer'],
  },
  {
    path: '/portal/payments',
    label: 'My Payments',
    bay: 'PORTAL 04',
    icon: CreditCard,
    roles: ['customer'],
  },
  {
    path: '/portal/profile',
    label: 'My Profile',
    bay: 'PORTAL 05',
    icon: User,
    roles: ['customer'],
  },
];

/**
 * Filter navigation items by current user role
 */
export function getNavItemsForRole(role) {
  if (!role) return [];
  return navItems.filter((item) => item.roles.includes(role));
}

