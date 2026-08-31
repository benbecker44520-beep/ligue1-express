"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LiveAutoRefresh({ seconds = 60 }) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), Math.max(30, seconds) * 1000);
    return () => window.clearInterval(timer);
  }, [router, seconds]);

  return null;
}
