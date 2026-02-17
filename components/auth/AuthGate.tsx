"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import ForcePasswordChange from "@/components/auth/ForcePasswordChange";

type AuthGateProps = {
  children: React.ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, fetchMe } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card px-8 py-6 shadow-lg">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-indigo-200 border-t-indigo-600" />
          <div className="text-sm font-medium text-foreground">
            Checking session<span className="animate-pulse">...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (user?.mustChangePassword) {
    return <ForcePasswordChange />;
  }

  return <>{children}</>;
}
