"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { createClient } from "./supabase-client";
import type { User } from "@supabase/supabase-js";

type UserRole = "superuser" | "admin" | "user";

type AuthContextType = {
  user: User | null;
  isAdmin: boolean;
  isSuperuser: boolean;
  isLoading: boolean;
  roles: UserRole[];
  displayName: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchUserRoles = useCallback(
    async (userId: string) => {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const userRoles = (rolesData?.map((r: { role: string }) => r.role) ||
        []) as UserRole[];
      setRoles(userRoles);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("display_name")
        .eq("user_id", userId)
        .single();

      setDisplayName(profile?.display_name || null);
    },
    [supabase],
  );

  const refreshAuth = useCallback(async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser);

      if (currentUser) {
        await fetchUserRoles(currentUser.id);
      } else {
        setRoles([]);
        setDisplayName(null);
      }
    } catch {
      setUser(null);
      setRoles([]);
      setDisplayName(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, fetchUserRoles]);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRoles([]);
    setDisplayName(null);
  };

  useEffect(() => {
    refreshAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRoles(session.user.id);
      } else {
        setRoles([]);
        setDisplayName(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, refreshAuth, fetchUserRoles]);

  const isAdmin = roles.includes("admin") || roles.includes("superuser");
  const isSuperuser = roles.includes("superuser");

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isSuperuser,
        isLoading,
        roles,
        displayName,
        signInWithGoogle,
        signOut,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
