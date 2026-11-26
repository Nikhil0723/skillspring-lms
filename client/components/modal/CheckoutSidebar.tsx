"use client";

import { CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import CheckoutForm from "../courseDetails/CheckoutForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
};

export default function CheckoutSidebar({ open, onOpenChange, courseId }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full overflow-y-auto border-r bg-background p-0 sm:max-w-[500px]">
        <SheetHeader className="border-b bg-background px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg font-semibold tracking-tight">Complete Your Purchase</SheetTitle>
              <SheetDescription className="mt-1 text-sm leading-relaxed">
                Continue to Razorpay to complete your enrollment.
              </SheetDescription>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
            <LockKeyhole className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Secure checkout</span>
            <span className="ml-auto flex items-center gap-1 text-xs font-medium text-emerald-600">
              <ShieldCheck className="size-3.5" /> Protected
            </span>
          </div>
        </SheetHeader>
        <div className="px-5 py-6 sm:px-6">
          <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <CheckoutForm courseId={courseId} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
