import { createContext, useContext, useState } from "react";

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

// Fuzzy search scoring algorithm
export function fuzzyScore(haystack: string, needle: string): number {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  
  if (!n) return 1;
  if (!h) return 0;
  if (h === n) return 10;
  if (h.includes(n)) return 8 + (h.indexOf(n) === 0 ? 2 : 0);
  
  let score = 0;
  let hIdx = 0;
  let nIdx = 0;
  let consecutiveMatches = 0;
  
  while (nIdx < n.length && hIdx < h.length) {
    if (n[nIdx] === h[hIdx]) {
      nIdx++;
      consecutiveMatches++;
      score += 1 + (consecutiveMatches * 0.5);
    } else {
      consecutiveMatches = 0;
      score -= 0.1;
    }
    hIdx++;
  }
  
  return nIdx === n.length ? Math.max(0, score / n.length) : 0;
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return context;
}
