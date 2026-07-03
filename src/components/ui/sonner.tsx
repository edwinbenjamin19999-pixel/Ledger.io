import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => { const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{ classNames: { toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-[#0F172A] group-[.toaster]:border-[0.5px] group-[.toaster]:border-[#E2E8F0] group-[.toaster]:rounded-[12px] group-[.toaster]:p-[12px] group-[.toaster]:shadow-none group-[.toaster]:text-[12px] group-[.toaster]:font-medium",
          description: "group-[.toast]:text-[#475569] group-[.toast]:text-[11px] group-[.toast]:font-normal",
          actionButton: "group-[.toast]:bg-[#0B4F6C] group-[.toast]:text-white group-[.toast]:rounded-[8px] group-[.toast]:text-[11px]",
          cancelButton: "group-[.toast]:bg-white group-[.toast]:border-[0.5px] group-[.toast]:border-[#E2E8F0] group-[.toast]:text-[#475569] group-[.toast]:rounded-[8px] group-[.toast]:text-[11px]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
