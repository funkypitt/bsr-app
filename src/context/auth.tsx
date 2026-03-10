import React, { createContext, useContext, useEffect, useState } from "react";
import * as api from "../api/client";

interface AuthState {
  ready: boolean;
  loggedIn: boolean;
  login: (user: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  ready: false,
  loggedIn: false,
  login: async () => false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    api.restoreSession().then((ok) => {
      setLoggedIn(ok);
      setReady(true);
    });
  }, []);

  const login = async (user: string, pass: string) => {
    const ok = await api.login(user, pass);
    setLoggedIn(ok);
    return ok;
  };

  const logout = async () => {
    await api.logout();
    setLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ ready, loggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
