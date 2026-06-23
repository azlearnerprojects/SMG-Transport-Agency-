# PAYMENT SETUP

Payments use a provider abstraction (`src/lib/payments`). The booking flow only depends
on the `PaymentProvider` interface, so providers are swappable via one env var.

## Providers

| Provider | When | Notes |
|---|---|---|
| `mock` (default) | Demo Mode | Simulated in-app gateway (`/payment/checkout`). **No real transactions.** Lets you test success and failure. |
| `paystack` | Test / production | Real Paystack REST API + signed webhooks. Use **test keys** in development. |

Select with `PAYMENT_PROVIDER=mock | paystack` in `.env.local`.

## Supported methods
Mobile Money (MTN, Telecel/Vodafone Cash, AirtelTigo), Visa/Mastercard, and bank transfer
(for corporate/bulk bookings). The chosen method maps to Paystack channels in
`src/lib/payments/paystack.ts`.

## Paystack test-mode setup

1. Create a Paystack account → Dashboard → **Settings → API Keys & Webhooks**.
2. Copy the **test** keys into `.env.local`:
   ```
   PAYMENT_PROVIDER=paystack
   PAYSTACK_PUBLIC_KEY=pk_test_xxx
   PAYSTACK_SECRET_KEY=sk_test_xxx
   PAYSTACK_WEBHOOK_SECRET=sk_test_xxx   # used to verify webhook signatures
   ```
3. Set the **webhook URL** to `https://<your-domain>/api/payments/webhook`
   (use an ngrok/Cloudflare tunnel for local testing).
4. Restart `npm run dev`.

> Use only **test** keys locally. Never make real transactions during development.

## Payment flow (security model)

1. `POST /api/payments/init` → provider `initialize()` returns an authorization URL; a
   `pending` payment is recorded against the booking.
2. Customer pays on the provider page (or the mock gateway).
3. **Server-side verification** is the source of truth:
   - Redirect callback → `GET /api/payments/verify` (or browser `POST` from the mock page).
   - The server independently calls `provider.verify(reference)`, validates the amount
     against the booking total, then confirms the booking **idempotently**.
4. **Webhook** `POST /api/payments/webhook` is the authoritative async confirmation. The
   raw body's signature is validated (HMAC-SHA512 for Paystack) before anything is trusted.

### Guarantees
- The browser's "success" is never trusted — confirmation requires server verification.
- Confirmation is **idempotent** (redirect + webhook can both arrive; only one effect).
- Duplicate processing is prevented via per-booking payment records + `idempotencyKey`.
- A receipt/e-ticket is generated **only after** verification.
- Secret keys live in env vars and never reach the browser; card data is never stored.

## Adding a new provider
Implement `PaymentProvider` (`initialize`, `verify`, `verifyWebhookSignature`) in a new
file under `src/lib/payments/`, register it in `getPaymentProvider()`, and set
`PAYMENT_PROVIDER` accordingly. No booking-flow changes are required.
