import {
  LayoutDashboard,
  Route as RouteIcon,
  Ticket,
  CreditCard,
  Settings,
} from 'lucide-react';
import type { StaffRole } from './types';

export interface AdminSubTab {
  href: string;
  label: string;
  /** Roles allowed to open this sub-tab (super_admin/admin always allowed). Empty = all staff. */
  roles: StaffRole[];
}

export interface AdminSection {
  /** Landing route for the section (first sub-tab). */
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Roles allowed to see this top-level tab (super_admin/admin always allowed). Empty = all staff. */
  roles: StaffRole[];
  /** Route prefixes that mark this section active. */
  paths: string[];
  children?: AdminSubTab[];
}

/**
 * Five top-level sections. Related modules are grouped as sub-tabs so the
 * sidebar stays short and the panel is easy to navigate. Server-side role
 * checks on each page remain authoritative; these lists only decide what to show.
 */
export const ADMIN_NAV: AdminSection[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: [],
    paths: ['/admin'],
  },
  {
    href: '/admin/bookings',
    label: 'Bookings',
    icon: Ticket,
    roles: ['operations_manager', 'booking_officer', 'customer_support', 'support_agent', 'ticket_inspector'],
    paths: ['/admin/bookings', '/admin/verify', '/admin/customers'],
    children: [
      { href: '/admin/bookings', label: 'All bookings', roles: ['operations_manager', 'booking_officer', 'customer_support'] },
      { href: '/admin/verify', label: 'Verify tickets', roles: ['ticket_inspector', 'booking_officer', 'operations_manager'] },
      { href: '/admin/customers', label: 'Customers', roles: ['customer_support', 'support_agent', 'operations_manager'] },
    ],
  },
  {
    href: '/admin/routes',
    label: 'Operations',
    icon: RouteIcon,
    roles: ['operations_manager', 'finance_officer'],
    paths: ['/admin/routes', '/admin/buses', '/admin/schedules', '/admin/seat-layouts', '/admin/fare-categories'],
    children: [
      { href: '/admin/routes', label: 'Routes', roles: ['operations_manager'] },
      { href: '/admin/buses', label: 'Buses & fleet', roles: ['operations_manager'] },
      { href: '/admin/schedules', label: 'Schedules', roles: ['operations_manager'] },
      { href: '/admin/seat-layouts', label: 'Seat layouts', roles: ['operations_manager'] },
      { href: '/admin/fare-categories', label: 'Fares', roles: ['operations_manager', 'finance_officer'] },
    ],
  },
  {
    href: '/admin/payments',
    label: 'Payments',
    icon: CreditCard,
    roles: ['finance_officer', 'operations_manager'],
    paths: ['/admin/payments', '/admin/reports'],
    children: [
      { href: '/admin/payments', label: 'Payments', roles: ['finance_officer', 'operations_manager'] },
      { href: '/admin/reports', label: 'Reports', roles: ['finance_officer', 'operations_manager'] },
    ],
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: Settings,
    roles: ['admin', 'operations_manager', 'finance_officer'],
    paths: ['/admin/settings', '/admin/config', '/admin/users'],
    children: [
      { href: '/admin/settings', label: 'Policies', roles: ['operations_manager', 'finance_officer'] },
      { href: '/admin/config', label: 'Site config', roles: ['operations_manager', 'finance_officer'] },
      { href: '/admin/users', label: 'Staff & roles', roles: ['admin'] },
    ],
  },
];

/** super_admin and admin can reach every module regardless of the per-item role list. */
function hasFullAccess(role: StaffRole) {
  return role === 'super_admin' || role === 'admin';
}

function roleCanSee(roles: StaffRole[], role: StaffRole) {
  return roles.length === 0 || roles.includes(role);
}

/** Top-level sections visible to a role. */
export function visibleSections(role: StaffRole): AdminSection[] {
  if (hasFullAccess(role)) return ADMIN_NAV;
  return ADMIN_NAV.filter((section) => roleCanSee(section.roles, role));
}

/** Sub-tabs of a section visible to a role. */
export function visibleChildren(section: AdminSection, role: StaffRole): AdminSubTab[] {
  if (!section.children) return [];
  if (hasFullAccess(role)) return section.children;
  return section.children.filter((child) => roleCanSee(child.roles, role));
}

/** The section that owns the current pathname (most specific match wins). */
export function activeSection(pathname: string): AdminSection | undefined {
  return [...ADMIN_NAV]
    .filter((section) =>
      section.paths.some((path) => (path === '/admin' ? pathname === '/admin' : pathname === path || pathname.startsWith(`${path}/`))),
    )
    .sort((a, b) => matchLength(b, pathname) - matchLength(a, pathname))[0];
}

function matchLength(section: AdminSection, pathname: string) {
  return Math.max(
    ...section.paths.map((path) =>
      path === '/admin' ? (pathname === '/admin' ? path.length : -1) : pathname === path || pathname.startsWith(`${path}/`) ? path.length : -1,
    ),
  );
}
