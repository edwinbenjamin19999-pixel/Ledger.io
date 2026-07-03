import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const STORAGE_KEY = "northledger_board_mode";

export function useBoardModeToggle() {
  const navigate = useNavigate();
  const location = useLocation();
  const [enabled, setEnabled] = useState<boolean>(
    typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1"
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      if (next) {
        navigate("/board");
      } else if (location.pathname === "/board") {
        navigate("/cfo");
      }
      return next;
    });
  }, [navigate, location.pathname]);

  return { enabled, toggle, setEnabled };
}
