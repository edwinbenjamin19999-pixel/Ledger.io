import { BenchmarkingEngine } from "@/components/benchmarking/BenchmarkingEngine";
import { PageHeader } from "@/components/layout/PageHeader";
import { BarChart3 } from "lucide-react";

const BenchmarkingPage = () => { return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Branschjämförelse"
        subtitle="Jämför ditt bolags nyckeltal mot anonymiserade branschdata"
      />
      <div className="px-8">
        <BenchmarkingEngine />
      </div>
    </div>
  );
};

export default BenchmarkingPage;
