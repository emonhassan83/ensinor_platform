export const SUBSCRIPTION_TYPE = {
  basic: 'basic',
  standard: 'standard',
  premium: 'premium',
  non_profits: 'non_profits',
  most_popular: 'most_popular',
  full_power: 'full_power',
} as const;

export const SUBSCRIPTION_STATUS = {
  pending: 'pending',
  confirmed: 'confirmed',
  cancelled: 'cancelled',
} as const;

export const PAYMENT_STATUS = {
  unpaid: 'unpaid',
  paid: 'paid',
  failed: 'failed',
} as const;

export const APPROVE_STATUS = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
} as const;

export type TApproveStatus = keyof typeof APPROVE_STATUS;
export type TSubscriptionType = keyof typeof SUBSCRIPTION_TYPE;
export type TSubscriptionStatus = keyof typeof SUBSCRIPTION_STATUS;
export type TPaymentStatus = keyof typeof PAYMENT_STATUS;
