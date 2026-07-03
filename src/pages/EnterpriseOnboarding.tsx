import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { EnterpriseOnboarding } from "@/components/consolidation/EnterpriseOnboarding";

const EnterpriseOnboardingPage = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (!loading && !user) { navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) { return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laddar...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
<main className="container mx-auto px-4 py-12">
        <EnterpriseOnboarding />
      </main>
    </div>
  );
};

export default EnterpriseOnboardingPage;