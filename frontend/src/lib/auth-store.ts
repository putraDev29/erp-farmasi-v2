import { create } from "zustand";

export interface UserSession {
  id: string;
  username: string;
  full_name: string;
  email: string;
  roles: string[];
  permissions?: string[];
  company_id: string;
  branch_id: string;
  company?: any;
  branch?: any;
}

interface AuthState {
  token: string | null;
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: UserSession) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setAuth: (token: string, user: UserSession) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    }
    set({ token, user, isAuthenticated: true, isLoading: false });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },
  initialize: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ token, user, isAuthenticated: true, isLoading: false });
          return;
        } catch (e) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
    }
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },
}));
