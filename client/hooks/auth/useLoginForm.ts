import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { login } from "@/lib/api/login";
import { demoLogin, type DemoRole } from "@/lib/api/demoLogin";
import { toast } from "sonner";
import { setUser } from "@/redux/features/auth/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { setClientAuthCookies } from "@/lib/api/setClientAuthCookies";

// 1 define schema with zod
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(6, { message: "password must be at least 6 characters long" }),
});

// 2 generate types from schema
export type LoginFormData = z.infer<typeof loginSchema>;

export function useLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useAppDispatch();
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const completeLogin = (data: Awaited<ReturnType<typeof login>>) => {
      dispatch(setUser(data.user));
      setClientAuthCookies({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      toast.success("login successfully");
      const callbackUrl = searchParams.get("callbackUrl");
      router.push(callbackUrl || "/");
  };
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: completeLogin,
    onError: (error) => {
      toast.error(error.message || "Login failed");
    },
  });
  const demoLoginMutation = useMutation({
    mutationFn: demoLogin,
    onSuccess: completeLogin,
    onError: (error) => toast.error(error.message || "Demo login failed"),
  });
  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };
  const onDemoLogin = (role: DemoRole) => demoLoginMutation.mutate(role);
  return {
    form,
    onSubmit,
    onDemoLogin,
    isPending: loginMutation.isPending || demoLoginMutation.isPending,
    showPassword,
    setShowPassword,
  };
}
