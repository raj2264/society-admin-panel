"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Society {
  id: string;
  name: string;
  address?: string;
}

interface AdminContextValue {
  societyId: string | undefined;
  societyData: Society | null;
  adminName: string;
  adminEmail: string | undefined;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [societyData, setSocietyData] = useState<Society | null>(null);
  const [adminName, setAdminName] = useState("Admin");
  const [adminEmail, setAdminEmail] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Avoid double-fetch in StrictMode / re-renders
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const getAdminData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push("/auth/login");
          return;
        }

        const { data: adminData, error } = await supabase
          .from("society_admins")
          .select(
            `id, user_id, society_id, email, name, password_changed,
            societies ( id, name, address )`
          )
          .eq("user_id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching society data:", error);
          await supabase.auth.signOut();
          router.push("/auth/login");
          return;
        }

        if (adminData) {
          const society = adminData.societies
            ? Array.isArray(adminData.societies)
              ? adminData.societies[0]
              : adminData.societies
            : null;

          if (society) {
            setSocietyData({ id: society.id, name: society.name, address: society.address });
          }
          setAdminName(adminData.name || adminData.email);
          setAdminEmail(adminData.email);

          // Check first login
          const passwordChanged =
            session.user.user_metadata?.password_changed === true ||
            adminData.password_changed === true;
          if (!passwordChanged && !window.location.pathname.includes("/change-password")) {
            router.push("/dashboard/change-password?first_login=true");
          }
        }
      } catch (error) {
        console.error("Error fetching admin:", error);
        try {
          await supabase.auth.signOut();
          router.push("/auth/login");
        } catch (_) {}
      } finally {
        setLoading(false);
      }
    };

    getAdminData();
  }, [router]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }, [router]);

  const value = useMemo<AdminContextValue>(
    () => ({
      societyId: societyData?.id,
      societyData,
      adminName,
      adminEmail,
      loading,
      signOut,
    }),
    [societyData, adminName, adminEmail, loading, signOut]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
