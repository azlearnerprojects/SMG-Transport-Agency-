import {
  LayoutDashboard,
  Bus,
  Route as RouteIcon,
  CalendarClock,
  Grid3x3,
  Tags,
  Ticket,
  CreditCard,
  Users,
  ShieldCheck,
  BadgePercent,
  FileText,
  Megaphone,
  HelpCircle,
  BarChart3,
  QrCode,
  Settings,
  ScrollText,
} from 'lucide-react';
import type { StaffRole } from './types';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Roles allowed to see this module (super_admin always allowed). */
  roles: StaffRole[];
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, roles: ['operations_manager', 'finance_officer', 'booking_officer', 'customer_support', 'content_editor', 'ticket_inspector'] },
  { href: '/admin/bookings', label: 'Bookings', icon: Ticket, roles: ['operations_manager', 'booking_officer', 'customer_support'] },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard, roles: ['finance_officer', 'operations_manager'] },
  { href: '/admin/buses', label: 'Buses', icon: Bus, roles: ['operations_manager'] },
  { href: '/admin/routes', label: 'Routes', icon: RouteIcon, roles: ['operations_manager'] },
  { href: '/admin/schedules', label: 'Schedules', icon: CalendarClock, roles: ['operations_manager'] },
  { href: '/admin/seat-layouts', label: 'Seat Layouts', icon: Grid3x3, roles: ['operations_manager'] },
  { href: '/admin/fare-categories', label: 'Fare Categories', icon: Tags, roles: ['operations_manager', 'finance_officer'] },
  { href: '/admin/customers', label: 'Customers', icon: Users, roles: ['customer_support', 'operations_manager'] },
  { href: '/admin/staff', label: 'Staff Accounts', icon: ShieldCheck, roles: [] },
  { href: '/admin/promotions', label: 'Promotions', icon: BadgePercent, roles: ['content_editor', 'operations_manager'] },
  { href: '/admin/content', label: 'Website Content', icon: FileText, roles: ['content_editor'] },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone, roles: ['content_editor', 'customer_support'] },
  { href: '/admin/faqs', label: 'FAQs', icon: HelpCircle, roles: ['content_editor'] },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3, roles: ['finance_officer', 'operations_manager'] },
  { href: '/admin/verify', label: 'Ticket Verification', icon: QrCode, roles: ['ticket_inspector', 'booking_officer', 'operations_manager'] },
  { href: '/admin/support', label: 'Support Inbox', icon: HelpCircle, roles: ['customer_support'] },
  { href: '/admin/settings', label: 'System Settings', icon: Settings, roles: [] },
  { href: '/admin/audit', label: 'Audit Logs', icon: ScrollText, roles: [] },
];
