import { PostHog } from "posthog-node";
import type { Model } from "mongoose";

export const getMonthlyAnalytics = async <T>(
  model: Model<T>,
  year?: number,
  filter: Record<string, unknown> = {},
) => {
  const effectiveYear = year ?? new Date().getUTCFullYear();
  const start = new Date(Date.UTC(effectiveYear, 0, 1));
  const end = new Date(Date.UTC(effectiveYear + 1, 0, 1));
  const grouped = await model.aggregate<{ _id: number; count: number }>([
    {
      $match: {
        ...filter,
        createdAt: { $gte: start, $lt: end },
      },
    },
    { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  return Array.from({ length: 12 }, (_, index) => ({
    month: new Date(Date.UTC(effectiveYear, index, 1)).toLocaleString("en-US", {
      month: "long",
      timeZone: "UTC",
    }),
    count: grouped.find((item) => item._id === index + 1)?.count ?? 0,
  }));
};

let client: PostHog | null | undefined;

const getClient = () => {
  if (client !== undefined) return client;
  const token = process.env.POSTHOG_PROJECT_TOKEN;
  const host = process.env.POSTHOG_HOST;
  client = token && host
    ? new PostHog(token, { host, flushAt: 1, flushInterval: 0 })
    : null;
  return client;
};

export const captureServerEvent = (
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {},
) => {
  try {
    getClient()?.capture({ distinctId, event, properties });
  } catch (error) {
    console.error("Analytics capture failed:", error);
  }
};

export const isPostHogCaptureConfigured = () => Boolean(getClient());
