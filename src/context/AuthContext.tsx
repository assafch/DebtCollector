
"use client";

import type { User as FirebaseUser } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // User state will be updated by onAuthStateChanged
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      // Handle error (e.g., show a toast message)
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // User state will be updated by onAuthStateChanged
    } catch (error) {
      console.error("Error during sign-out:", error);
      // Handle error
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
