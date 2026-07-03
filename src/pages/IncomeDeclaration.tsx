import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const IncomeDeclaration = () => { const navigate = useNavigate();
  useEffect(() => { navigate("/tax-agent?tab=ink2", { replace: true });
  }, [navigate]);
  return null;
};

export default IncomeDeclaration;
