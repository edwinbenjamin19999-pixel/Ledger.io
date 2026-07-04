import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export const BoardCanvas = ({ children }: { children: ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="min-h-screen bg-gray-50 board-mode-light">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 space-y-8">
        {children}
        <div className="flex justify-center pt-8">
          <Link
            to="/ai-ekonom"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs transition-all border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:border-[#3b82f6]/50"
          >
            <Sparkles className="h-3 w-3 text-[#3b82f6]" />
            Powered by AI CFO — öppna fullständig analys
          </Link>
        </div>
      </div>
    </div>
  );
};
