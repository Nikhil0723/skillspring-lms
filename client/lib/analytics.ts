import posthog from "posthog-js";

export const analyticsEnabled = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST,
);

export const captureEvent = (
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
) => {
  if (!analyticsEnabled || typeof window === "undefined") return;
  posthog.capture(event, properties);
};

export const identifyAnalyticsUser = (
  userId: string,
  properties: Record<string, string | number | boolean | null | undefined>,
) => {
  if (!analyticsEnabled || typeof window === "undefined") return;
  posthog.identify(userId, properties);
};

export const resetAnalyticsUser = () => {
  if (!analyticsEnabled || typeof window === "undefined") return;
  posthog.reset();
};
