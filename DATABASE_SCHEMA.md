# DATABASE SCHEMA

The domain model lives in `src/lib/types.ts` (TypeScript interfaces) with Zod input
schemas in `src/lib/schemas.ts`. The same shapes back both the Demo Mode mock store and
the production Firestore collections.

## Collections

| Collection | Purpose | Key fields |
|---|---|---|
| `users` | Auth profiles and customer accounts | `uid`, `displayName`, `email`, `photoURL`, `phone`, `role`, `status`, `createdAt`, `updatedAt`, `lastLoginAt` |
| `staffProfiles` | Staff accounts | `email`, `fullName`, `role`, `active` |
| `roles` | Role definitions / claims mapping | `role`, permissions |
| `buses` | Fleet | `busNumber`, `name`, `category`, `seatLayoutId`, `capacity`, `amenities[]`, `status`, `blockedSeatIds[]` |
| `seatLayouts` | Reusable coach grids | `rows`, `cols`, `cells[]` (`{id,row,col,kind,category}`), `capacity` |
| `routes` | Origin→destination routes | `code`, `origin`, `destination`, boarding point ids, `distanceKm`, `durationMinutes`, `popular` |
| `boardingPoints` | Terminals / pickup points | `city`, `name`, `address` |
| `schedules` | Specific departures | `routeId`, `busId`, `date`, `departureTime`, `arrivalTime`, `status`, `fares{standard,business,vip}`, `serviceFee`, `bookedSeatIds[]`, `promotionId?` |
| `seatHolds` | Temporary holds | `scheduleId`, `seatIds[]`, `sessionId`, `status`, `createdAt`, `expiresAt` |
| `bookings` | Bookings (full denormalised trip facts) | `reference`, `ticketNumber`, `scheduleId`, `seatIds[]`, `seatCategory`, `passenger`, `customerId?`, money fields, `status`, `paymentStatus`, `holdId?`, `rescheduleCount`, `history[]` |
| `bookingEvents` | Per-booking history (also embedded in `history[]`) | `type`, `message`, `at`, `actor` |
| `passengers` | Passenger records | name, phone, email, id details |
| `payments` | Payment transactions | `bookingId`, `reference`, `provider`, `method`, `amount`, `status`, `providerReference`, `idempotencyKey`, `verifiedAt?` |
| `refunds` | Refund records | `paymentId`, `amount`, `status` |
| `promotions` | Discount codes | `code`, `type`(percent/flat), `value`, `active`, `startsAt`, `endsAt`, `routeIds?` |
| `announcements` | Customer notices | `title`, `body`, `level`, `active`, `publishedAt` |
| `contentPages` | CMS content | `slug`, `title`, `body`, `published` |
| `faqs` | FAQ entries | `question`, `answer`, `category`, `order`, `published` |
| `policies` | Travel/support policies for chatbot and site content | `title`, `body`, `category`, `active`, `createdAt`, `updatedAt` |
| `supportMessages` | Contact-form submissions | `name`, `email`, `phone?`, `subject`, `message`, `status` |
| `notifications` | User notifications | `userId`, `type`, payload |
| `systemSettings` | Configurable policy | cancellation/reschedule cut-offs, fee %, max reschedules, refund days, seat-hold TTL |
| `siteConfig/public` | Safe browser-readable runtime settings | support contacts, booking flags, public Paystack key, announcement banner, chatbot public settings |
| `siteConfig/private` | Server/admin-only config container | chatbot runtime mirror; prefer Functions env or Secret Manager for true secrets |
| `remoteConfigDrafts` | Remote Config change audit/drafts | `values`, `reason`, `status`, `createdByUid`, `createdByEmail`, `createdAt` |
| `chatSessions` | Chatbot support sessions | `uid`, `anonymousId`, `status`, `createdAt`, `updatedAt`, `resolvedBy` |
| `chatSessions/{sessionId}/messages` | Chatbot messages | `sessionId`, `role`, `content`, `createdAt`, `status`, `error?` |
| `auditLogs` | Append-only staff actions and role/config changes | `action`, `performedByUid`, `performedByEmail`, `targetType`, `targetId`, `targetUid?`, `targetEmail?`, `previousValue`, `newValue`, `createdAt` |

All records carry `createdAt` / `updatedAt` (ISO strings) where appropriate.

## Booking status state machine

```
draft → seat_held → pending_payment → payment_processing → confirmed
                                  ↘ payment_failed (retryable)
confirmed → checked_in → completed
confirmed → cancel_requested → cancelled (+ refund)
confirmed → reschedule_requested → rescheduled (→ confirmed on new trip)
seat_held/pending_payment → expired (hold lapses)
confirmed → refunded / partially_refunded
```

## Payment status values
`initiated → pending → successful | failed | abandoned | reversed | refunded | partially_refunded`

## Money
All amounts are GHS, stored as two-decimal numbers. Fees are charged per seat;
discounts apply to base fare only and never push totals below zero (`src/lib/fare.ts`).
Card details are **never** stored — only provider transaction references.

## Indexes
See `firestore.indexes.json` — composite indexes for `schedules(routeId,date,departureTime)`,
`bookings(customerId,createdAt)`, `bookings(status,travelDate)`, `bookings(scheduleId,status)`,
`payments(status,createdAt)`, and `seatHolds(scheduleId,status,expiresAt)`.

## Sample data
The seed (`src/lib/data/seed.ts`) creates 2 seat layouts, 4 buses (Standard/Business/VIP),
6 routes (Cape Coast, Accra, Kumasi, Takoradi, Tema, Kasoa, Winneba), ~150 schedules over
7 days, 2 promotions, FAQs, announcements, content pages, 2 customers and sample
confirmed/pending bookings. **All sample data — not official SMG routes/prices.**
