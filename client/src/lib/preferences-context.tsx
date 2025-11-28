import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type TextSize = "small" | "normal" | "large";

interface UserPreferences {
  textSize: TextSize;
  compactMode: boolean;
  showAnimations: boolean;
}

interface PreferencesContextType {
  preferences: UserPreferences;
  setTextSize: (size: TextSize) => void;
  setCompactMode: (compact: boolean) => void;
  setShowAnimations: (show: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const DEFAULT_PREFERENCES: UserPreferences = {
  textSize: "normal",
  compactMode: false,
  showAnimations: true,
};

const STORAGE_KEY = "brotherhood_preferences";

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
    }
  }, []);

  // Save to localStorage whenever preferences change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  }, [preferences]);

  const setTextSize = (size: TextSize) => {
    setPreferences((prev) => ({ ...prev, textSize: size }));
  };

  const setCompactMode = (compact: boolean) => {
    setPreferences((prev) => ({ ...prev, compactMode: compact }));
  };

  const setShowAnimations = (show: boolean) => {
    setPreferences((prev) => ({ ...prev, showAnimations: show }));
  };

  return (
    <PreferencesContext.Provider
      value={{ preferences, setTextSize, setCompactMode, setShowAnimations }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return context;
}
