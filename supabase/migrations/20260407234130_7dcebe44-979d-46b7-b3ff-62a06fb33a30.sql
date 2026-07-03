CREATE TABLE public.anomaly_resolutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  anomaly_key TEXT NOT NULL,
  anomaly_category TEXT NOT NULL,
  anomaly_severity TEXT NOT NULL,
  anomaly_title TEXT NOT NULL,
  anomaly_description TEXT,
  resolution_type TEXT NOT NULL,
  resolution_reason TEXT,
  explanation TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.anomaly_resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anomaly_res_select" ON public.anomaly_resolutions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'accountant', company_id) OR public.has_role(auth.uid(), 'owner', company_id) OR public.has_role(auth.uid(), 'cfo', company_id) OR public.has_role(auth.uid(), 'auditor', company_id));

CREATE POLICY "anomaly_res_insert" ON public.anomaly_resolutions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'accountant', company_id) OR public.has_role(auth.uid(), 'owner', company_id) OR public.has_role(auth.uid(), 'cfo', company_id));

CREATE INDEX idx_anomaly_resolutions_company ON public.anomaly_resolutions(company_id);
CREATE INDEX idx_anomaly_resolutions_category ON public.anomaly_resolutions(anomaly_category);