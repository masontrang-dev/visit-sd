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

type UserRole = "superuser" | "admin" | "curator" | "user";

type AuthContextType = {
  user: User | null;
  isAdmin: boolean;
  isSuperuser: boolean;
  isLoading: boolean;
  roles: UserRole[];
  displayName: string | null;
  avatarUrl: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function pickAvatarFromUser(user: User): string | null {
  const googleIdentity = user.identities?.find((id) => id.provider === "google");
  return (
    googleIdentity?.identity_data?.avatar_url ||
    googleIdentity?.identity_data?.picture ||
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const hydrateUserData = useCallback(
    async (currentUser: User) => {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id);

      const userRoles = (rolesData?.map((r: { role: string }) => r.role) ||
        []) as UserRole[];
      setRoles(userRoles);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("display_name, avatar_url")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      setDisplayName(profile?.display_name || null);
      setAvatarUrl(profile?.avatar_url || pickAvatarFromUser(currentUser));
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
        await hydrateUserData(currentUser);
      } else {
        setRoles([]);
        setDisplayName(null);
        setAvatarUrl(null);
      }
    } catch {
      setUser(null);
      setRoles([]);
      setDisplayName(null);
      setAvatarUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, hydrateUserData]);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "profile email",
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRoles([]);
    setDisplayName(null);
    setAvatarUrl(null);
  };

  useEffect(() => {
    refreshAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        hydrateUserData(sessionUser);
      } else {
        setRoles([]);
        setDisplayName(null);
        setAvatarUrl(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, refreshAuth, hydrateUserData]);

  const isAdmin =
    roles.includes("admin") ||
    roles.includes("superuser") ||
    roles.includes("curator");
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
        avatarUrl,
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
