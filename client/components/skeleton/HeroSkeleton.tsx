"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function HeroSkeleton() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div className="text-center lg:pt-8 lg:text-left">
            <div className="mb-6 flex justify-center lg:justify-start">
              <Skeleton className="h-9 w-64 rounded-full" />
            </div>

            <div className="space-y-3">
              <Skeleton className="mx-auto h-12 w-full max-w-xl lg:mx-0" />
              <Skeleton className="mx-auto h-12 w-4/5 max-w-lg lg:mx-0" />
            </div>

            <div className="mx-auto mt-6 max-w-2xl space-y-2 lg:mx-0">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-11/12" />
              <Skeleton className="h-5 w-4/5" />
            </div>

            <div className="mx-auto mt-8 max-w-2xl lg:mx-0 lg:max-w-xl">
              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row">
                <Skeleton className="h-11 flex-1 rounded-md" />
                <Skeleton className="h-11 w-full rounded-md sm:w-24" />
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Skeleton className="h-11 w-full rounded-md sm:w-40" />
              <Skeleton className="h-11 w-full rounded-md sm:w-36" />
            </div>
          </div>

          <div className="relative flex items-start justify-center">
            <Skeleton
              className="
                relative
                aspect-[9/7]
                w-full
                max-w-[560px]
                rounded-2xl
              "
            />
          </div>
        </div>

      </div>
    </section>
  );
}
