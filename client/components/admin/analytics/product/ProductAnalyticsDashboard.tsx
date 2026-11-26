"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProductAnalytics, type ProductAnalytics } from "@/lib/api/getProductAnalytics";

const number = new Intl.NumberFormat("en-IN");
const money = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
});

const featureGroups = [
  {
    title: "Discovery", description: "How visitors find and inspect courses.",
    events: [
      ["course searched", "Searches submitted"],
      ["course search results viewed", "Search result pages"],
      ["catalog filter changed", "Catalog filter changes"],
      ["course viewed", "Course detail views"],
    ],
  },
  {
    title: "Checkout & payment", description: "Where buying starts, succeeds, or encounters friction.",
    events: [
      ["checkout modal opened", "Checkout opened"],
      ["checkout started", "Payment button clicked"],
      ["checkout prepared", "Razorpay order prepared"],
      ["checkout completed", "Client confirmed enrollment"],
      ["checkout failed to start", "Checkout launch failed"],
      ["payment verification failed", "Verification failed"],
      ["payment succeeded", "Captured and enrolled"],
      ["payment failed", "Payment failed"],
    ],
  },
  {
    title: "Learning", description: "Verified progress and certificates after enrollment.",
    events: [
      ["lecture opened", "Lectures opened"],
      ["lecture completed", "Lectures completed"],
      ["course completed", "Courses completed"],
      ["certificate issued", "Certificates issued"],
    ],
  },
  {
    title: "Account", description: "New accounts that completed email registration.",
    events: [["user signed up", "Signups"]],
  },
] as const;

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}

function FeatureSection({
  group, data,
}: {
  group: typeof featureGroups[number];
  data: ProductAnalytics;
}) {
  const find = (name: string) => (data.features ?? []).find((item) => item.name === name)
    ?? { count: 0, users: 0 };
  return (
    <article className="rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="font-semibold">{group.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[380px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 font-medium">Action</th>
              <th className="py-2 text-right font-medium">Events</th>
              <th className="py-2 text-right font-medium">People</th>
            </tr>
          </thead>
          <tbody>
            {group.events.map(([event, label]) => {
              const metric = find(event);
              return (
                <tr key={event} className="border-b last:border-0">
                  <td className="py-2.5">{label}</td>
                  <td className="py-2.5 text-right tabular-nums">{number.format(metric.count)}</td>
                  <td className="py-2.5 text-right tabular-nums">{number.format(metric.users)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default function ProductAnalyticsDashboard() {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["product-analytics", days],
    queryFn: () => getProductAnalytics(days),
    staleTime: 5 * 60 * 1000,
  });
  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading analytics…</p>;
  if (isError || !data) return (
    <div className="m-6 rounded-xl border border-destructive/30 p-5">
      <p className="text-sm text-destructive">{error?.message || "Could not load analytics"}</p>
      <Button className="mt-3" variant="outline" onClick={() => refetch()}>Try again</Button>
    </div>
  );

  const paymentTotal = data.payments.succeeded + data.payments.failed + data.payments.pending;
  const attention = data.payments.needsRefund > 0
    ? `${number.format(data.payments.needsRefund)} captured payment(s) need a refund review.`
    : data.payments.failed > 0
      ? `${number.format(data.payments.failed)} failed payment attempt(s) in this period.`
      : "No failed or refund-required payments recorded in this period.";
  const dateLabel = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", timeZone: "UTC",
  });

  return (
    <main className="space-y-6 p-3 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Product analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily traffic, course discovery, payments and learning activity · UTC dates
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Updated {new Date(data.generatedAt).toLocaleString("en-IN")} · refreshes at most every 5 minutes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((range) => (
            <Button key={range} size="sm" variant={days === range ? "default" : "outline"}
              onClick={() => setDays(range)}>{range} days</Button>
          ))}
          <Button size="icon-sm" variant="outline" disabled={isFetching}
            onClick={() => refetch()} aria-label="Refresh analytics">
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      {!data.configured.query && <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
        PostHog query credentials are missing. Revenue and enrollment figures still come from the database.
      </p>}
      {data.posthogError && <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {data.posthogError}
      </p>}
      {data.configured.query && data.traffic.pageviews === 0 && <p className="rounded-xl border bg-muted/40 p-4 text-sm">
        No pageviews in this period yet. Visit the site with analytics enabled to start the daily history.
      </p>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Unique visitors" value={number.format(data.traffic.uniqueVisitors)}
          detail="Distinct people with a pageview in the selected period" />
        <Metric label="Pageviews" value={number.format(data.traffic.pageviews)}
          detail="Every page opened, including repeat visits" />
        <Metric label="Sessions" value={number.format(data.traffic.sessions)}
          detail="PostHog browsing sessions" />
        <Metric label="Bounce rate" value={`${data.traffic.bounceRate}%`}
          detail="PostHog bounce sessions ÷ all sessions" />
        <Metric label="Avg. session" value={`${Math.floor(data.traffic.averageSessionSeconds / 60)}m ${data.traffic.averageSessionSeconds % 60}s`}
          detail="Average session duration" />
        <Metric label="Enrollments" value={number.format(data.business.enrollments)}
          detail="Confirmed orders in the database" />
        <Metric label="Revenue" value={money.format(data.business.revenue)}
          detail="Confirmed order value in INR" />
        <Metric label="Payment success" value={`${data.payments.successRate}%`}
          detail="Fulfilled ÷ fulfilled and failed attempts" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Daily visits</h2>
          <p className="mt-1 text-xs text-muted-foreground">Daily unique visitors and pageviews; one person can appear on multiple days.</p>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={20} fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip labelFormatter={(label) => dateLabel(String(label))} />
                <Legend />
                <Area type="monotone" dataKey="visitors" name="Visitors" stroke="#6366f1" fill="#6366f1" fillOpacity={0.22} />
                <Area type="monotone" dataKey="pageviews" name="Pageviews" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Daily course and purchase activity</h2>
          <p className="mt-1 text-xs text-muted-foreground">Action counts by event date; enrollments come from confirmed orders.</p>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={20} fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip labelFormatter={(label) => dateLabel(String(label))} />
                <Legend />
                <Bar dataKey="courseViews" name="Course views" fill="#6366f1" />
                <Bar dataKey="checkouts" name="Checkout starts" fill="#f59e0b" />
                <Bar dataKey="enrollments" name="Enrollments" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-semibold">Daily detail</h2>
            <p className="mt-1 text-xs text-muted-foreground">Use this table to pinpoint which day changed. Scroll horizontally on smaller screens.</p>
          </div>
          <span className="text-xs text-muted-foreground">Showing {data.daily.length} UTC days</span>
        </div>
        <div className="mt-4 max-h-96 overflow-auto">
          <table className="w-full min-w-[1000px] text-right text-sm">
            <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
              <tr className="border-b">
                {["Date", "Visitors", "Views", "Sessions", "Bounce", "Searches", "Course views", "Checkout", "Payments", "Enrollments", "Revenue"].map((label) =>
                  <th key={label} className="px-2 py-2 font-medium first:text-left">{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...data.daily].reverse().map((day) => (
                <tr key={day.date} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-2 py-2 text-left">{dateLabel(day.date)}</td>
                  {[day.visitors, day.pageviews, day.sessions].map((value, index) =>
                    <td key={index} className="px-2 py-2 tabular-nums">{number.format(value)}</td>)}
                  <td className="px-2 py-2 tabular-nums">{day.sessions ? Math.round(day.bounces / day.sessions * 100) : 0}%</td>
                  {[day.searches, day.courseViews, day.checkouts, day.payments, day.enrollments].map((value, index) =>
                    <td key={index} className="px-2 py-2 tabular-nums">{number.format(value)}</td>)}
                  <td className="px-2 py-2 tabular-nums">{money.format(day.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Feature usage</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Events are total actions; people are distinct users for each action. These are independent counts, not an ordered funnel.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {featureGroups.map((group) => <FeatureSection key={group.title} group={group} data={data} />)}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Payment health</h2>
          <p className="mt-1 text-xs text-muted-foreground">{attention}</p>
          <div className="mt-4 space-y-2 text-sm">
            {[
              ["Fulfilled", data.payments.succeeded], ["Failed", data.payments.failed],
              ["Awaiting capture", data.payments.pending], ["Needs refund", data.payments.needsRefund],
            ].map(([label, value]) => <div key={label} className="flex justify-between border-b py-2 last:border-0">
              <span>{label}</span><span className="font-semibold tabular-nums">{number.format(Number(value))}</span>
            </div>)}
            <p className="pt-2 text-xs text-muted-foreground">{number.format(paymentTotal)} total attempts, excluding refund review</p>
          </div>
        </article>
        <article className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Top pages</h2>
          <p className="mt-1 text-xs text-muted-foreground">Most viewed paths, including repeat visits.</p>
          <div className="mt-4 space-y-2 text-sm">
            {data.traffic.topPages.length ? data.traffic.topPages.map((page) =>
              <div key={page.path} className="flex gap-3 border-b py-2 last:border-0">
                <span className="min-w-0 flex-1 truncate" title={page.path}>{page.path}</span>
                <span className="tabular-nums">{number.format(page.views)} views</span>
              </div>) : <p className="text-muted-foreground">No page data yet.</p>}
          </div>
        </article>
        <article className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Traffic channels</h2>
          <p className="mt-1 text-xs text-muted-foreground">PostHog channel classification at session entry.</p>
          <div className="mt-4 space-y-2 text-sm">
            {data.traffic.channels.length ? data.traffic.channels.map((channel) =>
              <div key={channel.channel} className="flex justify-between border-b py-2 last:border-0">
                <span>{channel.channel}</span>
                <span className="font-semibold tabular-nums">{number.format(channel.sessions)}</span>
              </div>) : <p className="text-muted-foreground">No channel data yet.</p>}
          </div>
        </article>
      </section>
    </main>
  );
}
