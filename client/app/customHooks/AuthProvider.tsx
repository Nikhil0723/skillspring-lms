"use client";
import { getMe } from "@/lib/api/getMe";
import { logoutUser, setUser } from "@/redux/features/auth/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import { useQuery } from "@tanstack/react-query";
import  { ReactNode, useEffect } from "react";
import { identifyAnalyticsUser, resetAnalyticsUser } from "@/lib/analytics";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { data, isError } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isError) {
      dispatch(logoutUser());
      resetAnalyticsUser();
    }
  }, [isError, dispatch]);

  useEffect(() => {
    if (data) {
      dispatch(setUser(data.user));
      identifyAnalyticsUser(String(data.user._id), {
        role: data.user.role,
        is_verified: data.user.isVerified,
      });
    }
  }, [data, dispatch]);
  return children;
}
