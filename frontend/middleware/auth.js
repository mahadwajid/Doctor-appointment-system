"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAuth(requiredRole = null) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      if (requiredRole && parsedUser.role !== requiredRole && parsedUser.role !== "SUPER_ADMIN") {
        router.push("/login");
        return;
      }
    } catch (error) {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router, requiredRole]);

  return { user, loading };
}

