import fs from 'node:fs';
import path from 'node:path';
import { APP_URL, DEMO_MODE, PAYMENT_PROVIDER, getPaystackConfig } from './config';
import type {
  ProductionReadinessCheck,
  ProductionReadinessStatus,
  ProductionReadinessSummary,
  PublicSiteConfig,
} from './types';

interface ReadinessInput {
  siteConfig?: PublicSiteConfig;
  siteConfigConfigured?: boolean;
}

const DEFAULT_FIREBASE_PROJECT_ID = 'smg-transport-agency';
const STRONG_SECRET_MIN_LENGTH = 32;
const IMPLEMENTED_SMS_PROVIDERS = new Set<string>();

function env(name: string): string {
  return process.env[name]?.trim() ?? '';
}

function add(
  checks: ProductionReadinessCheck[],
  status: ProductionReadinessStatus,
  id: string,
  label: string,
  message: string,
  help?: string,
) {
  checks.push({ id, label, status, message, ...(help ? { help } : {}) });
}

function readFirebasercProject(): string | undefined {
  try {
    const file = path.join(process.cwd(), '.firebaserc');
    if (!fs.existsSync(file)) return undefined;
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { projects?: { default?: unknown } };
    return typeof parsed.projects?.default === 'string' ? parsed.projects.default.trim() : undefined;
  } catch {
    return undefined;
  }
}

function expectedFirebaseProjectId(): string {
  return env('PRODUCTION_FIREBASE_PROJECT_ID') || readFirebasercProject() || DEFAULT_FIREBASE_PROJECT_ID;
}

function parseHosts(value: string): string[] {
  return value
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function parseCanonicalUrl(): URL | null {
  try {
    return new URL(APP_URL);
  } catch {
    return null;
  }
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.local');
}

function defaultFirebaseHostingHosts(projectId: string): Set<string> {
  return new Set([`${projectId}.web.app`, `${projectId}.firebaseapp.com`]);
}

function credentialFileStatus(projectId: string): { status: ProductionReadinessStatus; message: string; help?: string } {
  const credentialPath = env('GOOGLE_APPLICATION_CREDENTIALS');
  if (!credentialPath) {
    return {
      status: 'fail',
      message: 'No explicit Firebase Admin credential source was found.',
      help: 'Set inline Admin SDK env vars, GOOGLE_APPLICATION_CREDENTIALS, or run this check in the Firebase/Cloud Run runtime.',
    };
  }

  const resolved = path.resolve(process.cwd(), credentialPath);
  if (!fs.existsSync(resolved)) {
    return {
      status: 'fail',
      message: 'GOOGLE_APPLICATION_CREDENTIALS points to a missing file.',
      help: 'Store the service-account or ADC JSON outside the repo and set GOOGLE_APPLICATION_CREDENTIALS to its full path.',
    };
  }

  const relative = path.relative(process.cwd(), resolved);
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
    return {
      status: 'fail',
      message: 'GOOGLE_APPLICATION_CREDENTIALS points inside the repository.',
      help: 'Move Firebase credential JSON outside the repo so it cannot be committed or deployed as source.',
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8')) as Record<string, unknown>;
    if (parsed.type === 'service_account') {
      const credentialProject = typeof parsed.project_id === 'string' ? parsed.project_id : '';
      if (credentialProject && credentialProject !== projectId) {
        return {
          status: 'fail',
          message: `Firebase Admin service-account JSON is for "${credentialProject}", not "${projectId}".`,
          help: 'Use a service account from the SMG Firebase project.',
        };
      }
      if (!parsed.client_email || !parsed.private_key) {
        return {
          status: 'fail',
          message: 'Firebase Admin service-account JSON is missing client_email or private_key.',
          help: 'Download a fresh Admin SDK service-account key from Firebase Project settings.',
        };
      }
      return { status: 'pass', message: 'Firebase Admin service-account JSON is present and matches the project.' };
    }
    if (parsed.type === 'authorized_user') {
      return {
        status: env('FIREBASE_PROJECT_ID') || env('GCLOUD_PROJECT') || env('GCP_PROJECT') ? 'pass' : 'warning',
        message: 'Google ADC authorized-user credentials are present.',
        help: env('FIREBASE_PROJECT_ID') || env('GCLOUD_PROJECT') || env('GCP_PROJECT')
          ? undefined
          : 'Set FIREBASE_PROJECT_ID or gcloud config project so Admin SDK calls target the SMG project.',
      };
    }
    return {
      status: 'warning',
      message: 'GOOGLE_APPLICATION_CREDENTIALS exists, but its JSON type is not recognized by this local check.',
      help: 'Run an Admin SDK smoke test before deploy.',
    };
  } catch {
    return {
      status: 'fail',
      message: 'GOOGLE_APPLICATION_CREDENTIALS is not valid JSON.',
      help: 'Replace it with a valid Firebase service-account or Google ADC JSON file.',
    };
  }
}

function checkFirebaseAdmin(checks: ProductionReadinessCheck[], projectId: string) {
  const hasInlineProject = Boolean(env('FIREBASE_PROJECT_ID'));
  const hasInlineEmail = Boolean(env('FIREBASE_CLIENT_EMAIL'));
  const hasInlineKey = Boolean(env('FIREBASE_PRIVATE_KEY'));
  const hasInline = hasInlineProject && hasInlineEmail && hasInlineKey;
  const hasPartialInline = hasInlineProject || hasInlineEmail || hasInlineKey;
  const runtimeCredentialSignal = Boolean(env('FIREBASE_CONFIG') || env('K_SERVICE') || env('FUNCTION_TARGET'));

  if (hasInline) {
    if (env('FIREBASE_PROJECT_ID') !== projectId) {
      add(
        checks,
        'fail',
        'firebase-admin',
        'Firebase Admin credentials',
        `FIREBASE_PROJECT_ID is "${env('FIREBASE_PROJECT_ID')}", not "${projectId}".`,
        'Use Admin SDK credentials from the SMG Firebase project.',
      );
      return;
    }
    const privateKey = env('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');
    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      add(
        checks,
        'fail',
        'firebase-admin',
        'Firebase Admin credentials',
        'FIREBASE_PRIVATE_KEY is present but does not look like a service-account private key.',
        'Keep the literal "\\n" escapes when storing the key on one line.',
      );
      return;
    }
    add(checks, 'pass', 'firebase-admin', 'Firebase Admin credentials', 'Inline Firebase Admin credentials are present for the SMG project.');
    return;
  }

  if (hasPartialInline) {
    const missing = [
      ['FIREBASE_PROJECT_ID', hasInlineProject],
      ['FIREBASE_CLIENT_EMAIL', hasInlineEmail],
      ['FIREBASE_PRIVATE_KEY', hasInlineKey],
    ]
      .filter(([, present]) => !present)
      .map(([name]) => name);
    add(
      checks,
      'fail',
      'firebase-admin',
      'Firebase Admin credentials',
      `Firebase Admin inline credentials are incomplete: missing ${missing.join(', ')}.`,
      'Set all three inline variables or use GOOGLE_APPLICATION_CREDENTIALS.',
    );
    return;
  }

  if (runtimeCredentialSignal) {
    add(
      checks,
      'pass',
      'firebase-admin',
      'Firebase Admin credentials',
      'Firebase/Cloud Run runtime credential signals are present.',
    );
    return;
  }

  const fileStatus = credentialFileStatus(projectId);
  add(checks, fileStatus.status, 'firebase-admin', 'Firebase Admin credentials', fileStatus.message, fileStatus.help);
}

function checkFirebaseClient(checks: ProductionReadinessCheck[], projectId: string) {
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ];
  const missing = required.filter((name) => !env(name));
  if (missing.length > 0) {
    add(
      checks,
      'fail',
      'firebase-client',
      'Firebase client config',
      `Missing Firebase browser config: ${missing.join(', ')}.`,
      'Copy the Web app config from Firebase Project settings into the production environment.',
    );
    return;
  }

  if (env('NEXT_PUBLIC_FIREBASE_PROJECT_ID') !== projectId) {
    add(
      checks,
      'fail',
      'firebase-client',
      'Firebase client config',
      `NEXT_PUBLIC_FIREBASE_PROJECT_ID is "${env('NEXT_PUBLIC_FIREBASE_PROJECT_ID')}", not "${projectId}".`,
      'Use the SMG Firebase project web app config.',
    );
    return;
  }

  add(checks, 'pass', 'firebase-client', 'Firebase client config', 'Firebase browser config is present for the SMG project.');
}

function checkFirebaseAuthDomain(checks: ProductionReadinessCheck[], projectId: string, canonicalHost?: string) {
  const authDomain = env('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN').toLowerCase();
  if (!authDomain) return;

  if (isLocalHost(authDomain)) {
    add(
      checks,
      'fail',
      'firebase-auth-domain',
      'Firebase Auth domain',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN points at a local host.',
      'Use the Firebase Auth domain from the production web app config.',
    );
    return;
  }
  if (authDomain.endsWith('.web.app')) {
    add(
      checks,
      'fail',
      'firebase-auth-domain',
      'Firebase Auth domain',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN uses a Hosting .web.app domain.',
      `Use ${projectId}.firebaseapp.com unless a custom Firebase Auth domain is configured.`,
    );
    return;
  }
  if (authDomain.endsWith('.firebaseapp.com') && authDomain !== `${projectId}.firebaseapp.com`) {
    add(
      checks,
      'fail',
      'firebase-auth-domain',
      'Firebase Auth domain',
      `Firebase Auth domain "${authDomain}" does not match project "${projectId}".`,
      `Use ${projectId}.firebaseapp.com or the approved custom auth domain.`,
    );
    return;
  }
  if (canonicalHost && authDomain === canonicalHost) {
    add(
      checks,
      'warning',
      'firebase-auth-domain',
      'Firebase Auth domain',
      'Firebase Auth domain is the same as the public canonical host.',
      'This is valid only if that custom Auth domain is configured in Firebase Authentication.',
    );
    return;
  }

  add(checks, 'pass', 'firebase-auth-domain', 'Firebase Auth domain', 'Firebase Auth domain looks compatible with the production project.');
}

function checkCanonical(checks: ProductionReadinessCheck[], projectId: string): URL | null {
  const url = parseCanonicalUrl();
  if (!url) {
    add(
      checks,
      'fail',
      'canonical-url',
      'Canonical app URL',
      'NEXT_PUBLIC_APP_URL is not a valid absolute URL.',
      'Set it to the production origin, for example https://smgagencygh.com.',
    );
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || isLocalHost(host)) {
    add(
      checks,
      'fail',
      'canonical-url',
      'Canonical app URL',
      'NEXT_PUBLIC_APP_URL must be a public HTTPS production URL.',
      'This URL drives canonical tags, sitemap, robots, payment callbacks, and QR verification links.',
    );
  } else if ((url.pathname && url.pathname !== '/') || url.search || url.hash || url.username || url.password) {
    add(
      checks,
      'fail',
      'canonical-url',
      'Canonical app URL',
      'NEXT_PUBLIC_APP_URL must be an origin only, with no path, query, hash, or credentials.',
      'Use https://domain.example, not https://domain.example/app or a preview URL.',
    );
  } else {
    add(checks, 'pass', 'canonical-url', 'Canonical app URL', 'NEXT_PUBLIC_APP_URL is a public HTTPS origin.');
  }

  const allowedHosts = parseHosts(env('PRODUCTION_CANONICAL_HOSTS'));
  const firebaseHosts = defaultFirebaseHostingHosts(projectId);
  if (firebaseHosts.has(host)) {
    add(
      checks,
      'fail',
      'canonical-host',
      'Canonical domain allow-list',
      `NEXT_PUBLIC_APP_URL uses Firebase default host "${host}" instead of the approved launch domain.`,
      'Attach the custom domain in Firebase Hosting, then set NEXT_PUBLIC_APP_URL and PRODUCTION_CANONICAL_HOSTS to that domain.',
    );
  } else if (allowedHosts.length === 0) {
    add(
      checks,
      'fail',
      'canonical-host',
      'Canonical domain allow-list',
      'PRODUCTION_CANONICAL_HOSTS is not set, so this check cannot prove the canonical host is intentional.',
      'Set PRODUCTION_CANONICAL_HOSTS to the approved launch host(s), comma-separated.',
    );
  } else if (!allowedHosts.includes(host)) {
    add(
      checks,
      'fail',
      'canonical-host',
      'Canonical domain allow-list',
      `NEXT_PUBLIC_APP_URL host "${host}" is not in PRODUCTION_CANONICAL_HOSTS.`,
      'This prevents preview, Firebase default, or typo domains from becoming canonical in sitemap/payment links.',
    );
  } else {
    add(checks, 'pass', 'canonical-host', 'Canonical domain allow-list', 'Canonical host matches the approved production host list.');
  }

  return url;
}

function checkPayment(checks: ProductionReadinessCheck[]) {
  if (PAYMENT_PROVIDER !== 'paystack') {
    add(
      checks,
      'fail',
      'payment-provider',
      'Payment provider',
      'PAYMENT_PROVIDER must be paystack for production.',
      'The mock provider is demo-only and never creates real transactions.',
    );
  } else {
    add(checks, 'pass', 'payment-provider', 'Payment provider', 'PAYMENT_PROVIDER is paystack.');
  }

  try {
    const paystack = getPaystackConfig();
    if (paystack.mode !== 'live') {
      add(
        checks,
        'fail',
        'paystack-keys',
        'Paystack live keys',
        'Paystack keys are in test mode.',
        'Use pk_live_ and sk_live_ keys from the live Paystack dashboard.',
      );
    } else {
      add(checks, 'pass', 'paystack-keys', 'Paystack live keys', 'Live Paystack public, secret, and webhook key modes match.');
    }
  } catch (error) {
    add(
      checks,
      'fail',
      'paystack-keys',
      'Paystack live keys',
      error instanceof Error ? error.message : String(error),
      'Set PAYSTACK_PUBLIC_KEY, PAYSTACK_SECRET_KEY, and optional PAYSTACK_WEBHOOK_SECRET with matching live keys.',
    );
  }

  if (env('NEXT_PUBLIC_PAYSTACK_SECRET_KEY')) {
    add(
      checks,
      'fail',
      'paystack-secret-exposure',
      'Paystack secret exposure',
      'NEXT_PUBLIC_PAYSTACK_SECRET_KEY is set.',
      'Remove it. Paystack secret keys must only exist in server-side environment variables.',
    );
  } else {
    add(checks, 'pass', 'paystack-secret-exposure', 'Paystack secret exposure', 'No public Paystack secret env var was found.');
  }

  if (!env('PAYSTACK_WEBHOOK_SECRET')) {
    add(
      checks,
      'warning',
      'paystack-webhook-secret',
      'Paystack webhook secret',
      'PAYSTACK_WEBHOOK_SECRET is not set; webhook verification will fall back to PAYSTACK_SECRET_KEY.',
      'This is supported by the app, but keep the Paystack dashboard and production env intentionally aligned.',
    );
  } else {
    add(checks, 'pass', 'paystack-webhook-secret', 'Paystack webhook secret', 'PAYSTACK_WEBHOOK_SECRET is explicitly set.');
  }
}

function checkSecrets(checks: ProductionReadinessCheck[]) {
  const adminSecret = env('ADMIN_SESSION_SECRET');
  const qrSecret = env('QR_VERIFY_SECRET');
  const weak: string[] = [];
  if (adminSecret.length < STRONG_SECRET_MIN_LENGTH) weak.push('ADMIN_SESSION_SECRET');
  if (qrSecret.length < STRONG_SECRET_MIN_LENGTH) weak.push('QR_VERIFY_SECRET');

  if (weak.length > 0) {
    add(
      checks,
      'fail',
      'server-secrets',
      'Server signing secrets',
      `${weak.join(', ')} must be at least ${STRONG_SECRET_MIN_LENGTH} characters.`,
      'Generate separate random values for admin sessions and QR verification.',
    );
    return;
  }
  if (adminSecret === qrSecret) {
    add(
      checks,
      'fail',
      'server-secrets',
      'Server signing secrets',
      'ADMIN_SESSION_SECRET and QR_VERIFY_SECRET must not be the same value.',
      'Use separate random secrets so one signing scope cannot verify the other.',
    );
    return;
  }
  add(checks, 'pass', 'server-secrets', 'Server signing secrets', 'Admin session and QR signing secrets are strong and distinct.');
}

function checkPublicSiteConfig(checks: ProductionReadinessCheck[], input: ReadinessInput) {
  const site = input.siteConfig;
  if (!site) {
    add(
      checks,
      'warning',
      'admin-site-config',
      'Admin public site config',
      'Public site config was not loaded by this local CLI run.',
      'Open /admin/config after deploy credentials are configured; the admin page checks payment mode, booking switches, and public Paystack key.',
    );
    return;
  }

  if (input.siteConfigConfigured === false) {
    add(
      checks,
      'fail',
      'admin-site-config',
      'Admin public site config',
      'Admin public site config is using the local fallback because Firebase Admin is not configured.',
      'Configure Firebase Admin credentials so live booking/payment switches are read from Firestore.',
    );
  } else {
    add(checks, 'pass', 'admin-site-config', 'Admin public site config', 'Admin public site config is backed by Firestore.');
  }

  const blockers: string[] = [];
  if (site.maintenanceMode) blockers.push('maintenance mode is enabled');
  if (!site.bookingEnabled) blockers.push('booking is disabled');
  if (!site.bookingOpeningEnabled) blockers.push('booking window is closed');
  if (site.paymentGatewayMode !== 'live') blockers.push('payment mode is not live');
  if (blockers.length > 0) {
    add(
      checks,
      'fail',
      'admin-launch-switches',
      'Admin launch switches',
      `Admin config is not launch-ready: ${blockers.join(', ')}.`,
      'Use /admin/config to enable bookings and set Payment mode to Live before go-live.',
    );
  } else {
    add(checks, 'pass', 'admin-launch-switches', 'Admin launch switches', 'Bookings are enabled and admin payment mode is live.');
  }

  if (!site.paystackPublicKey) {
    add(
      checks,
      'fail',
      'admin-paystack-public-key',
      'Admin Paystack public key',
      'Admin config does not contain a Paystack public key.',
      'Set the live public key in /admin/config so staff can audit the public payment configuration.',
    );
  } else if (!site.paystackPublicKey.startsWith('pk_live_')) {
    add(
      checks,
      'fail',
      'admin-paystack-public-key',
      'Admin Paystack public key',
      'Admin config Paystack public key is not a live key.',
      'Use the pk_live_ key that matches the production Paystack account.',
    );
  } else if (env('PAYSTACK_PUBLIC_KEY') && site.paystackPublicKey !== env('PAYSTACK_PUBLIC_KEY')) {
    add(
      checks,
      'fail',
      'admin-paystack-public-key',
      'Admin Paystack public key',
      'Admin config Paystack public key does not match PAYSTACK_PUBLIC_KEY.',
      'Keep the public site config and server payment env pointed at the same Paystack account.',
    );
  } else {
    add(checks, 'pass', 'admin-paystack-public-key', 'Admin Paystack public key', 'Admin config uses a live Paystack public key.');
  }

  if (site.emailProviderEnabled && !(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASSWORD'))) {
    add(
      checks,
      'warning',
      'email-provider',
      'Email provider',
      'Admin config says email is enabled, but SMTP env vars are incomplete.',
      'Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM_EMAIL or turn off the public email flag.',
    );
  } else {
    add(checks, 'pass', 'email-provider', 'Email provider', 'Email provider flag and SMTP env are consistent.');
  }

  if (site.smsProviderEnabled) {
    const provider = env('SMS_PROVIDER');
    if (!provider || !env('SMS_API_KEY')) {
      add(
        checks,
        'warning',
        'sms-provider',
        'SMS provider',
        'Admin config says SMS is enabled, but SMS_PROVIDER or SMS_API_KEY is missing.',
        'Set provider credentials or turn off the public SMS flag.',
      );
    } else if (!IMPLEMENTED_SMS_PROVIDERS.has(provider)) {
      add(
        checks,
        'warning',
        'sms-provider',
        'SMS provider',
        `SMS_PROVIDER "${provider}" has credentials but no implemented sender in src/lib/sms/index.ts.`,
        'Implement the provider HTTP call before promising SMS delivery in production.',
      );
    } else {
      add(checks, 'pass', 'sms-provider', 'SMS provider', 'SMS provider flag and env are consistent.');
    }
  } else {
    add(checks, 'pass', 'sms-provider', 'SMS provider', 'SMS is disabled in public config.');
  }
}

function checkAppCheck(checks: ProductionReadinessCheck[]) {
  if (env('ENFORCE_APP_CHECK') === 'true' && !env('NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY')) {
    add(
      checks,
      'fail',
      'app-check',
      'Firebase App Check',
      'ENFORCE_APP_CHECK is true, but NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY is missing.',
      'Set the reCAPTCHA Enterprise/App Check site key before enforcing callable Functions.',
    );
  } else if (env('NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY') && env('ENFORCE_APP_CHECK') !== 'true') {
    add(
      checks,
      'warning',
      'app-check',
      'Firebase App Check',
      'An App Check site key is configured, but ENFORCE_APP_CHECK is not true.',
      'Enable enforcement after confirming Firebase Console App Check setup.',
    );
  } else {
    add(checks, 'pass', 'app-check', 'Firebase App Check', 'App Check env is internally consistent.');
  }
}

export function getProductionReadinessChecks(input: ReadinessInput = {}): ProductionReadinessCheck[] {
  const checks: ProductionReadinessCheck[] = [];
  const projectId = expectedFirebaseProjectId();

  if (DEMO_MODE) {
    add(
      checks,
      'fail',
      'runtime-mode',
      'Runtime mode',
      'NEXT_PUBLIC_DEMO_MODE must be false for production.',
      'Demo mode uses in-memory data and mock-only behavior.',
    );
  } else {
    add(checks, 'pass', 'runtime-mode', 'Runtime mode', 'Demo mode is disabled.');
  }

  const canonicalUrl = checkCanonical(checks, projectId);
  checkFirebaseClient(checks, projectId);
  checkFirebaseAuthDomain(checks, projectId, canonicalUrl?.hostname.toLowerCase());
  checkFirebaseAdmin(checks, projectId);
  checkPayment(checks);
  checkSecrets(checks);
  checkPublicSiteConfig(checks, input);
  checkAppCheck(checks);

  return checks;
}

export function summarizeProductionReadiness(input: ReadinessInput = {}): ProductionReadinessSummary {
  const checks = getProductionReadinessChecks(input);
  const counts: Record<ProductionReadinessStatus, number> = {
    pass: 0,
    warning: 0,
    fail: 0,
  };
  for (const check of checks) counts[check.status] += 1;
  return {
    ready: counts.fail === 0,
    generatedAt: new Date().toISOString(),
    counts,
    checks,
  };
}
