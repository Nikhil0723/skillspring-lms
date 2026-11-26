import CertificateModel from "../models/certificate.model";
import CourseProgressModel from "../models/courseProgress.model";
import OrderModel from "../models/order.model";
import PaymentAttempt from "../models/paymentAttempt.model";
import UserModel from "../models/user.model";
import { getCached, setCached } from "../utils/redis";
import { isPostHogCaptureConfigured } from "../utils/analytics";

type PostHogStats = {
  configured: boolean;
  error?: string;
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
  daily: Array<{ date: string; visitors: number; pageviews: number; sessions: number; bounces: number; searches: number; courseViews: number; checkouts: number; payments: number; lectureCompletions: number }>;
  features: Array<{ name: string; count: number; users: number }>;
  topPages: Array<{ path: string; views: number; visitors: number }>;
  channels: Array<{ channel: string; sessions: number }>;
};

const emptyPostHogStats = (configured = false): PostHogStats => ({
  configured,
  pageviews: 0,
  uniqueVisitors: 0,
  sessions: 0,
  averageSessionSeconds: 0,
  bounceRate: 0,
  courseViews: 0,
  searches: 0,
  checkouts: 0,
  payments: 0,
  lectureCompletions: 0,
  courseCompletions: 0,
  daily: [],
  features: [],
  topPages: [],
  channels: [],
});

const runHogQL = async (query: string) => {
  const apiHost = process.env.POSTHOG_API_HOST;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!apiHost || !projectId || !apiKey) return null;

  const response = await fetch(`${apiHost}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });
  if (!response.ok) throw new Error(`PostHog query failed with status ${response.status}`);
  const body = await response.json() as { results?: unknown[][]; error?: string };
  if (body.error) throw new Error(body.error);
  return body;
};

const getPostHogStats = async (days: number): Promise<PostHogStats> => {
  const queryConfigured = Boolean(
    process.env.POSTHOG_API_HOST &&
      process.env.POSTHOG_PROJECT_ID &&
      process.env.POSTHOG_PERSONAL_API_KEY,
  );
  if (!queryConfigured) return emptyPostHogStats(false);

  try {
    const [summary, sessions, dailyVisits, dailySessions, dailyActions, features, topPages, channels] = await Promise.all([
      runHogQL(`
        SELECT
          countIf(event = '$pageview'),
          uniqIf(distinct_id, event = '$pageview'),
          uniqIf(distinct_id, event = 'course viewed'),
          countIf(event = 'course searched'),
          uniqIf(distinct_id, event IN ('checkout started', 'checkout prepared')),
          uniqIf(distinct_id, event = 'payment succeeded'),
          countIf(event = 'lecture completed'),
          uniqIf(distinct_id, event = 'course completed')
        FROM events
        WHERE timestamp >= now() - INTERVAL ${days} DAY
      `),
      runHogQL(`
        SELECT count(), countIf($is_bounce = 1), avg($session_duration)
        FROM sessions WHERE $start_timestamp >= now() - INTERVAL ${days} DAY
      `),
      runHogQL(`
        SELECT toDate(timestamp), uniq(distinct_id), count()
        FROM events WHERE timestamp >= now() - INTERVAL ${days} DAY AND event = '$pageview'
        GROUP BY toDate(timestamp) ORDER BY toDate(timestamp)
      `),
      runHogQL(`
        SELECT toDate($start_timestamp), count(), countIf($is_bounce = 1)
        FROM sessions WHERE $start_timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY toDate($start_timestamp) ORDER BY toDate($start_timestamp)
      `),
      runHogQL(`
        SELECT toDate(timestamp),
          countIf(event = 'course searched'), countIf(event = 'course viewed'),
          countIf(event = 'checkout started'), countIf(event = 'payment succeeded'),
          countIf(event = 'lecture completed')
        FROM events WHERE timestamp >= now() - INTERVAL ${days} DAY
          AND event IN ('course searched', 'course viewed', 'checkout started',
            'payment succeeded', 'lecture completed')
        GROUP BY toDate(timestamp) ORDER BY toDate(timestamp)
      `),
      runHogQL(`
        SELECT event, count(), uniq(distinct_id)
        FROM events WHERE timestamp >= now() - INTERVAL ${days} DAY
          AND event IN ('user signed up', 'course searched', 'course search results viewed',
            'catalog filter changed', 'course viewed',
            'checkout modal opened', 'checkout started', 'checkout prepared',
            'checkout completed', 'checkout failed to start', 'payment verification failed',
            'payment succeeded', 'payment failed', 'lecture opened', 'lecture completed',
            'course completed', 'certificate issued')
        GROUP BY event
      `),
      runHogQL(`
        SELECT toString(properties.$pathname), count(), uniq(distinct_id)
        FROM events WHERE timestamp >= now() - INTERVAL ${days} DAY
          AND event = '$pageview' AND notEmpty(toString(properties.$pathname))
        GROUP BY toString(properties.$pathname) ORDER BY count() DESC LIMIT 10
      `),
      runHogQL(`
        SELECT toString($channel_type), count()
        FROM sessions WHERE $start_timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY toString($channel_type) ORDER BY count() DESC LIMIT 8
      `),
    ]);
    const row = summary?.results?.[0] ?? [];
    const sessionRow = sessions?.results?.[0] ?? [];
    const byDate = (rows: unknown[][] = []) => new Map(rows.map((entry) => [String(entry[0]).slice(0, 10), entry]));
    const visitsByDate = byDate(dailyVisits?.results);
    const sessionsByDate = byDate(dailySessions?.results);
    const actionsByDate = byDate(dailyActions?.results);
    const daily = Array.from({ length: days }, (_, index) => {
      const date = new Date(Date.now() - (days - index - 1) * 86400000).toISOString().slice(0, 10);
      const visit = visitsByDate.get(date) ?? [];
      const session = sessionsByDate.get(date) ?? [];
      const action = actionsByDate.get(date) ?? [];
      return {
        date, visitors: Number(visit[1] ?? 0), pageviews: Number(visit[2] ?? 0),
        sessions: Number(session[1] ?? 0), bounces: Number(session[2] ?? 0),
        searches: Number(action[1] ?? 0), courseViews: Number(action[2] ?? 0),
        checkouts: Number(action[3] ?? 0), payments: Number(action[4] ?? 0),
        lectureCompletions: Number(action[5] ?? 0),
      };
    });
    return {
      configured: true,
      pageviews: Number(row[0] ?? 0),
      uniqueVisitors: Number(row[1] ?? 0),
      sessions: Number(sessionRow[0] ?? 0),
      averageSessionSeconds: Math.round(Number(sessionRow[2] ?? 0)),
      courseViews: Number(row[2] ?? 0),
      searches: Number(row[3] ?? 0),
      checkouts: Number(row[4] ?? 0),
      payments: Number(row[5] ?? 0),
      lectureCompletions: Number(row[6] ?? 0),
      courseCompletions: Number(row[7] ?? 0),
      bounceRate: Number(sessionRow[0] ?? 0)
        ? Number((100 * Number(sessionRow[1] ?? 0) / Number(sessionRow[0])).toFixed(1)) : 0,
      daily,
      features: (features?.results ?? []).map((entry) => ({
        name: String(entry[0]), count: Number(entry[1] ?? 0), users: Number(entry[2] ?? 0),
      })),
      topPages: (topPages?.results ?? []).map((entry) => ({
        path: String(entry[0]), views: Number(entry[1] ?? 0), visitors: Number(entry[2] ?? 0),
      })),
      channels: (channels?.results ?? []).map((entry) => ({
        channel: String(entry[0] || "Direct"), sessions: Number(entry[1] ?? 0),
      })),
    };
  } catch (error) {
    console.error("PostHog analytics query failed:", error);
    return { ...emptyPostHogStats(true), error: "PostHog reports could not load. Check the server log." };
  }
};

export const getProductAnalytics = async (days: number) => {
  const cacheKey = `analytics:product:v3:${days}`;
  const cached = await getCached<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [
    posthog,
    registrations,
    orderSummary,
    dailyOrders,
    activeLearnerIds,
    courseCompletions,
    certificates,
    createdPayments,
    fulfilledPayments,
    failedPayments,
    refundPayments,
  ] = await Promise.all([
    getPostHogStats(days),
    UserModel.countDocuments({ createdAt: { $gte: from } }),
    OrderModel.aggregate([
      { $match: { createdAt: { $gte: from } } },
      { $group: { _id: null, enrollments: { $sum: 1 }, revenue: { $sum: "$price" } } },
    ]),
    OrderModel.aggregate([
      { $match: { createdAt: { $gte: from } } },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
        enrollments: { $sum: 1 }, revenue: { $sum: "$price" },
      } },
    ]),
    CourseProgressModel.distinct("user", { updatedAt: { $gte: from } }),
    CourseProgressModel.countDocuments({
      updatedAt: { $gte: from },
      totalLectures: { $gt: 0 },
      $expr: { $gte: [{ $size: "$completedLectures" }, "$totalLectures"] },
    }),
    CertificateModel.countDocuments({ issuedAt: { $gte: from } }),
    PaymentAttempt.countDocuments({ createdAt: { $gte: from }, status: "created" }),
    PaymentAttempt.countDocuments({ createdAt: { $gte: from }, status: "fulfilled" }),
    PaymentAttempt.countDocuments({ createdAt: { $gte: from }, status: "failed" }),
    PaymentAttempt.countDocuments({ createdAt: { $gte: from }, status: "needs_refund" }),
  ]);

  const orders = orderSummary[0] ?? { enrollments: 0, revenue: 0 };
  const ordersByDay = new Map(dailyOrders.map((entry) => [String(entry._id), entry]));
  const daySeries = posthog.daily.length ? posthog.daily : Array.from({ length: days }, (_, index) => ({
    date: new Date(Date.now() - (days - index - 1) * 86400000).toISOString().slice(0, 10),
    visitors: 0, pageviews: 0, sessions: 0, bounces: 0,
    searches: 0, courseViews: 0, checkouts: 0, payments: 0, lectureCompletions: 0,
  }));
  const daily = daySeries.map((entry) => {
    const order = ordersByDay.get(entry.date);
    return { ...entry, enrollments: Number(order?.enrollments ?? 0), revenue: Number(order?.revenue ?? 0) };
  });
  const settledPayments = fulfilledPayments + failedPayments;
  const result = {
    days,
    generatedAt: new Date().toISOString(),
    configured: {
      capture: isPostHogCaptureConfigured(),
      query: posthog.configured,
    },
    timezone: "UTC",
    posthogError: posthog.error ?? null,
    traffic: posthog,
    daily,
    features: posthog.features,
    business: {
      registrations,
      enrollments: orders.enrollments,
      revenue: orders.revenue,
      activeLearners: activeLearnerIds.length,
      courseCompletions,
      certificates,
      visitorToEnrollmentRate: posthog.uniqueVisitors
        ? Number(((orders.enrollments / posthog.uniqueVisitors) * 100).toFixed(1))
        : 0,
    },
    payments: {
      pending: createdPayments,
      succeeded: fulfilledPayments,
      failed: failedPayments,
      needsRefund: refundPayments,
      successRate: settledPayments
        ? Number(((fulfilledPayments / settledPayments) * 100).toFixed(1))
        : 0,
    },
  };
  if (!posthog.error) await setCached(cacheKey, result, 300);
  return result;
};
