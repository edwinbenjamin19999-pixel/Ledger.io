import { OperatingConsole } from "@/components/ai/operating/OperatingConsole";
import { AutoPaySKVSettings } from "@/components/settings/AutoPaySKVSettings";
import { useCompanyId } from "@/hooks/useCompanyId";

export default function AISettings() {
  const companyId = useCompanyId();
  return (
    <div className="space-y-6">
      <OperatingConsole />
      <div className="px-4 md:px-8 max-w-5xl">
        <AutoPaySKVSettings companyId={companyId} />
      </div>
    </div>
  );
}
