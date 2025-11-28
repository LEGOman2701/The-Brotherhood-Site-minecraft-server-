import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthChange, type FirebaseUser, isFirebaseConfigured } from "./firebase";
import type { User } from "@shared/schema";
import { apiRequest } from "./queryClient";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  isOwner: boolean;
  hasAdminAccess: boolean;
  isConfigured: boolean;
  setHasAdminAccess: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        try {
          // Sync user with backend
          const token = await fbUser.getIdToken();
          const response = await fetch("/api/auth/sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
              "X-User-Id": fbUser.uid,
            },
            body: JSON.stringify({
              id: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
              photoURL: fbUser.photoURL,
            }),
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setHasAdminAccess(userData.hasAdminAccess);
            // Store in sessionStorage for development mode
            if (import.meta.env.DEV) {
              sessionStorage.setItem("devUser", JSON.stringify(fbUser));
            }
          }
        } catch (error) {
          console.error("Failed to sync user:", error);
        }
      } else {
        setUser(null);
        setHasAdminAccess(false);
        sessionStorage.removeItem("devUser");
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isOwner = user?.email?.toLowerCase() === "thebrotherhoodofalaska@outlook.com";
  const isSettingsAdmin = user?.email?.toLowerCase() === "thebrotherhoodofalaska@outlook.com" || 
                          user?.email?.toLowerCase() === "2thumbsupgames@gmail.com";

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        loading,
        isOwner: isSettingsAdmin, // Use isSettingsAdmin for owner checks so both emails get settings access
        hasAdminAccess,
        isConfigured: isFirebaseConfigured,
        setHasAdminAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
