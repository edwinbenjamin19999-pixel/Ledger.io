import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function FAQPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/#faq", { replace: true });
  }, [navigate]);
  return null;
}
