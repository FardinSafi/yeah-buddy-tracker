"use client";

import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthStore = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  initialized: boolean;
  setAuth: (session: Session | null) => void;
  refreshSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  initialized: false,

  setAuth: (session) => {
    set({
      session,
      user: session?.user ?? null,
      initialized: true,
      isLoading: false,
    });
  },

  refreshSession: async () => {
    const supabase = createClient();
    set({ isLoading: true });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    set({
      session,
      user: session?.user ?? null,
      initialized: true,
      isLoading: false,
    });
  },

  login: async (email, password) => {
    const supabase = createClient();
    set({ isLoading: true });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      set({ isLoading: false });
      throw error;
    }

    set({
      session: data.session,
      user: data.user,
      initialized: true,
      isLoading: false,
    });
  },

  signup: async (email, password) => {
    const supabase = createClient();
    set({ isLoading: true });

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      set({ isLoading: false });
      throw error;
    }

    set({
      session: data.session,
      user: data.user,
      initialized: true,
      isLoading: false,
    });
  },

  logout: async () => {
    const supabase = createClient();
    set({ isLoading: true });

    const { error } = await supabase.auth.signOut();

    if (error) {
      set({ isLoading: false });
      throw error;
    }

    set({
      session: null,
      user: null,
      initialized: true,
      isLoading: false,
    });
  },
}));
