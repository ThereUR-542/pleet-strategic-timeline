import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export interface CitationsContextValue {
  isOpen: boolean;
  /** Open the panel; pass a citation.id to scroll to that entry. */
  open: (targetCitationId?: string) => void;
  close: () => void;
  targetCitationId: string | null;
  clearTarget: () => void;
}

const CitationsContext = createContext<CitationsContextValue | null>(null);

export function CitationsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [targetCitationId, setTargetCitationId] = useState<string | null>(null);

  const open = useCallback((id?: string) => {
    setTargetCitationId(id ?? null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTargetCitationId(null);
  }, []);

  const clearTarget = useCallback(() => setTargetCitationId(null), []);

  return (
    <CitationsContext.Provider value={{ isOpen, open, close, targetCitationId, clearTarget }}>
      {children}
    </CitationsContext.Provider>
  );
}

export function useCitations(): CitationsContextValue {
  const ctx = useContext(CitationsContext);
  if (!ctx) throw new Error("useCitations must be used within CitationsProvider");
  return ctx;
}
