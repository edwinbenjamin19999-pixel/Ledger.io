import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { TransactionReviewQueue } from '@/components/securities/TransactionReviewQueue';

export default function SecuritiesTransactionsPage() {
  const navigate = useNavigate();
  return (
    <PageLayout title="Granskningskö">
      <Button variant="ghost" size="sm" onClick={() => navigate('/securities')} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
      </Button>
      <PageHeader
        title="Granskningskö — Transaktioner"
        subtitle="Granska AI-klassificerade händelser innan bokföring"
      />
      <TransactionReviewQueue />
    </PageLayout>
  );
}
