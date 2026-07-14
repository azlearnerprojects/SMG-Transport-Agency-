export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
  '';

type Gtag = (...args: [command: string, ...values: unknown[]]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
  route?: string;
  travel_date?: string;
};

type AnalyticsParams = Record<string, unknown>;

function getGtag(): Gtag | undefined {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return undefined;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    ((...args) => {
      window.dataLayer?.push(args);
    });

  return window.gtag;
}

function cleanParams(params: AnalyticsParams): AnalyticsParams {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

export function trackPageView(url: string): void {
  const gtag = getGtag();
  if (!gtag) return;

  gtag('event', 'page_view', {
    page_location: url,
    page_title: document.title,
  });
}

export function trackEvent(name: string, params: AnalyticsParams = {}): void {
  const gtag = getGtag();
  if (!gtag) return;

  gtag('event', name, cleanParams(params));
}

export function bookingAnalyticsItem(input: {
  reference: string;
  origin: string;
  destination: string;
  seatCategory: string;
  seatCount: number;
  total: number;
  travelDate: string;
}): AnalyticsItem {
  return {
    item_id: input.reference,
    item_name: `${input.origin} to ${input.destination} bus ticket`,
    item_brand: 'SMG Transport Agency',
    item_category: 'Bus ticket',
    item_variant: input.seatCategory,
    price: input.total,
    quantity: input.seatCount,
    route: `${input.origin} to ${input.destination}`,
    travel_date: input.travelDate,
  };
}

export function trackAddPaymentInfo(input: {
  value: number;
  currency: string;
  paymentType: string;
  coupon?: string;
  items: AnalyticsItem[];
}): void {
  trackEvent('add_payment_info', {
    currency: input.currency,
    value: input.value,
    payment_type: input.paymentType,
    coupon: input.coupon,
    items: input.items,
  });
}

export function trackPurchase(input: {
  transactionId: string;
  value: number;
  currency: string;
  coupon?: string;
  items: AnalyticsItem[];
}): void {
  trackEvent('purchase', {
    transaction_id: input.transactionId,
    affiliation: 'SMG Transport Agency',
    currency: input.currency,
    value: input.value,
    coupon: input.coupon,
    items: input.items,
  });
}
