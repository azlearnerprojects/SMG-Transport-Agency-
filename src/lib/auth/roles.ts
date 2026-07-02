import type { AccountStatus, AuthRole, StaffRole } from '@/lib/types';

export const AUTH_ROLES: AuthRole[] = ['super_admin', 'admin', 'staff', 'support_agent', 'customer', 'staff_pending'];
export const ACCOUNT_STATUSES: AccountStatus[] = ['active', 'pending', 'disabled'];

export const ROLE_LABELS: Record<StaffRole | AuthRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
  support_agent: 'Support Agent',
  customer: 'Customer',
  staff_pending: 'Staff Pending',
  operations_manager: 'Operations Manager',
  booking_officer: 'Booking Officer',
  customer_support: 'Customer Support',
  finance_officer: 'Finance Officer',
  content_editor: 'Content Editor',
  ticket_inspector: 'Ticket Inspector',
};

export const STATUS_LABELS: Record<AccountStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  disabled: 'Disabled',
};

export function isAuthRole(role: string | null | undefined): role is AuthRole {
  return Boolean(role && (AUTH_ROLES as string[]).includes(role));
}

export function isAccountStatus(status: string | null | undefined): status is AccountStatus {
  return Boolean(status && (ACCOUNT_STATUSES as string[]).includes(status));
}

export function isAdminRole(role: StaffRole | AuthRole | null | undefined): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canUseStaffDashboard(role: StaffRole | AuthRole | null | undefined): boolean {
  return (
    isAdminRole(role) ||
    role === 'support_agent' ||
    role === 'operations_manager' ||
    role === 'booking_officer' ||
    role === 'customer_support' ||
    role === 'finance_officer' ||
    role === 'content_editor' ||
    role === 'ticket_inspector'
  );
}
