import React from 'react';

// Staff & Admin Billing Pages
import { SubscriptionsList } from './pages/billing/SubscriptionsList';
import { SubscriptionCreate } from './pages/billing/SubscriptionCreate';
import { SubscriptionDetail } from './pages/billing/SubscriptionDetail';
import { InvoicesList } from './pages/billing/InvoicesList';
import { InvoiceDetail } from './pages/billing/InvoiceDetail';
import { PaymentsList } from './pages/billing/PaymentsList';
import { QuotationTemplates } from './pages/billing/QuotationTemplates';
import { TaxesPage } from './pages/billing/TaxesPage';
import { DiscountsPage } from './pages/billing/DiscountsPage';

// Customer Portal Pages
import { MySubscriptions } from './pages/portal/MySubscriptions';
import { MyInvoices } from './pages/portal/MyInvoices';
import { MyPayments } from './pages/portal/MyPayments';
import { MyProfile } from './pages/portal/MyProfile';

/**
 * Person 4: Billing & Customer Portal Route Registry
 * Injected dynamically by App.jsx under the Protected Chassis
 */
export const billingRoutes = [
  // --- Staff & Admin Modules ---
  {
    path: '/subscriptions',
    element: <SubscriptionsList />,
    roles: ['admin', 'staff'],
  },
  {
    path: '/subscriptions/new',
    element: <SubscriptionCreate />,
    roles: ['admin', 'staff'],
  },
  {
    path: '/subscriptions/:id',
    element: <SubscriptionDetail />,
    roles: ['admin', 'staff'],
  },
  {
    path: '/invoices',
    element: <InvoicesList />,
    roles: ['admin', 'staff'],
  },
  {
    path: '/invoices/:id',
    element: <InvoiceDetail />,
    roles: ['admin', 'staff'],
  },
  {
    path: '/payments',
    element: <PaymentsList />,
    roles: ['admin', 'staff'],
  },
  {
    path: '/quotations',
    element: <QuotationTemplates />,
    roles: ['admin', 'staff'],
  },
  {
    path: '/taxes',
    element: <TaxesPage />,
    roles: ['admin'],
  },
  {
    path: '/discounts',
    element: <DiscountsPage />,
    roles: ['admin'],
  },

  // --- Customer Portal Modules ---
  {
    path: '/portal/subscriptions',
    element: <MySubscriptions />,
    roles: ['customer'],
  },
  {
    path: '/portal/invoices',
    element: <MyInvoices />,
    roles: ['customer'],
  },
  {
    path: '/portal/invoices/:id',
    element: <InvoiceDetail />,
    roles: ['customer', 'admin', 'staff'],
  },
  {
    path: '/portal/payments',
    element: <MyPayments />,
    roles: ['customer'],
  },
  {
    path: '/portal/profile',
    element: <MyProfile />,
    roles: ['customer'],
  },
];

export default billingRoutes;
