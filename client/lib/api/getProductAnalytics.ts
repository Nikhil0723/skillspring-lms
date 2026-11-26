import { apiClient } from "./apiClient";

export type ProductAnalytics = {
  days: number;
  generatedAt: string;
  timezone: string;
  posthogError: string | null;
  configured: { capture: boolean; query: boolean };
  traffic: {
    configured: boolean;
    pageviews: number;
    uniqueVisitors: number;
    sessions: number;
    averageSessionSeconds: number;
    bounceRate: number;
    courseViews: number;
    searches: number;
    checkouts: number;
    payments: number;
    lectureCompletions: number;
    courseCompletions: number;
    topPages: { path: string; views: number; visitors: number }[];
    channels: { channel: string; sessions: number }[];
  };
  daily: {
    date: string; visitors: number; pageviews: number; sessions: number;
    bounces: number; searches: number; courseViews: number; checkouts: number;
    payments: number; lectureCompletions: number; enrollments: number; revenue: number;
  }[];
  features: { name: string; count: number; users: number }[];
  business: {
    registrations: number;
    enrollments: number;
    revenue: number;
    activeLearners: number;
    courseCompletions: number;
    certificates: number;
    visitorToEnrollmentRate: number;
  };
  payments: {
    pending: number;
    succeeded: number;
    failed: number;
    needsRefund: number;
    successRate: number;
  };
};

export const getProductAnalytics = async (days: number) => {
  const response = await apiClient(`/analytics/product?days=${days}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Could not load product analytics");
  const analytics = data.analytics as ProductAnalytics & {
    traffic?: ProductAnalytics["traffic"] & { features?: ProductAnalytics["features"] };
  };
  if (!analytics || !Array.isArray(analytics.daily) || !analytics.traffic ||
      !Array.isArray(analytics.traffic.topPages) ||
      !Array.isArray(analytics.traffic.channels)) {
    throw new Error("Analytics server response is outdated. Restart the server, then refresh this page.");
  }
  const features = Array.isArray(analytics.features)
    ? analytics.features
    : analytics.traffic.features;
  if (!Array.isArray(features)) {
    throw new Error("Feature analytics is unavailable. Restart the server, then refresh this page.");
  }
  return { ...analytics, features };
};
