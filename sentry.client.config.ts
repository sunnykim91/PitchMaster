import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 0.1,

  // Session replay (optional, captures user interactions)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,

  // Environment
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_COMMIT_HASH,
});
