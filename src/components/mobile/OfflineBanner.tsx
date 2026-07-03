import { useEffect, useState } from "react";

/**
 * Visar en gul banner högst upp när enheten är offline.
 * Använder navigator.onLine + online/offline-event.
 */
export const OfflineBanner = () => {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;

  return (
    <div
      className="fixed left-0 right-0 z-50 bg-[#FAEEDA] text-[#412402] text-[11px] text-center py-[6px] font-medium"
      style={{ top: "env(safe-area-inset-top)" }}
    >
      Offline — data kan vara inaktuell
    </div>
  );
};
