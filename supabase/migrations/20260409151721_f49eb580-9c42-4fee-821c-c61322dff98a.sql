-- Create tax form catalog table
CREATE TABLE public.tax_form_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_code TEXT NOT NULL UNIQUE,
  skv_number TEXT NOT NULL,
  name_sv TEXT NOT NULL,
  category TEXT NOT NULL,
  entity_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  requires_forms JSONB DEFAULT '[]'::jsonb,
  deadline_rule JSONB DEFAULT NULL,
  ai_supported BOOLEAN NOT NULL DEFAULT false,
  auto_fetch BOOLEAN NOT NULL DEFAULT false,
  relevance_rule TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tax_form_catalog ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read the catalog
CREATE POLICY "Authenticated users can read tax form catalog"
ON public.tax_form_catalog
FOR SELECT
TO authenticated
USING (true);

-- Create index for fast lookups
CREATE INDEX idx_tax_form_catalog_code ON public.tax_form_catalog (form_code);
CREATE INDEX idx_tax_form_catalog_category ON public.tax_form_catalog (category);

-- Seed data
INSERT INTO public.tax_form_catalog (form_code, skv_number, name_sv, category, entity_types, requires_forms, deadline_rule, ai_supported, auto_fetch, relevance_rule) VALUES
('INK1', '2000', 'Inkomstdeklaration 1', 'Inkomstdeklarationer', '["ef"]', '["NE"]', '{"type":"fixed","month":5,"day":2}', true, true, '3*,4*,5*,6*,7*'),
('INK2', '2002', 'Inkomstdeklaration 2 — Aktiebolag', 'Inkomstdeklarationer', '["ab","ek"]', '["INK2R","INK2S","N9"]', '{"type":"fixed","month":7,"day":1}', true, true, '3*,4*,7*,8*'),
('INK3', '2003', 'Inkomstdeklaration 3 — Ideella föreningar', 'Inkomstdeklarationer', '["ek"]', '[]', '{"type":"fixed","month":7,"day":1}', false, false, NULL),
('INK4', '2004', 'Inkomstdeklaration 4 — Handelsbolag', 'Inkomstdeklarationer', '["hb"]', '[]', '{"type":"fixed","month":7,"day":1}', true, true, '3*,4*'),
('NE', '2161', 'Enskild näringsverksamhet', 'Bilagor till INK1', '["ef"]', '[]', NULL, true, true, '3*,4*,5*,6*,7*'),
('INK2R', '2001', 'Räkenskapsschemat', 'Bilagor till INK2', '["ab","ek"]', '[]', NULL, true, true, '1*,2*,3*,4*,5*,6*,7*,8*'),
('INK2S', '2001S', 'Avskrivningar och nedskrivningar', 'Bilagor till INK2', '["ab","ek"]', '[]', NULL, true, true, '1010-1299,7810-7840'),
('INK2A', '2001A', 'Avskrivningar byggnader/mark', 'Bilagor till INK2', '["ab","ek"]', '[]', NULL, false, false, '1110,1120,1130'),
('INK2L', '2001L', 'Lättnadsberäkning onoterade andelar', 'Bilagor till INK2', '["ab"]', '[]', NULL, true, false, '2081'),
('N9', '2168', 'Ränteavdragsbegränsning', 'Bilagor till INK2', '["ab"]', '[]', NULL, true, false, '8400-8499,8300-8399'),
('K10', '2110', 'Kvalificerade andelar — Fåmansföretag', 'Bilagor till INK1', '["ab"]', '[]', '{"type":"fixed","month":5,"day":2}', true, true, '2081,2091-2098'),
('K12', '2109', 'Överlåtelse fåmansandelar', 'Bilagor till INK1', '["ab"]', '[]', NULL, true, false, '1310-1399'),
('K4', '2104', 'Försäljning av aktier m.m.', 'Bilagor till INK1', '["ab","ef"]', '[]', NULL, false, false, '1350-1370'),
('K7', '2112', 'Försäljning av näringsfastighet', 'Bilagor till INK1', '["ab","ef","hb"]', '[]', NULL, true, false, '1110-1199'),
('SKV4700', '4700', 'Momsdeklaration', 'Mervärdesskatt', '["ab","ef","hb","ek"]', '[]', '{"type":"recurring","frequency":"monthly"}', true, true, '2610-2650,3*'),
('SKV4703', '4703', 'Periodisk sammanställning EU', 'Mervärdesskatt', '["ab","ef","hb","ek"]', '[]', NULL, true, true, '3108,3308'),
('AGI', '4650', 'Arbetsgivardeklaration', 'Arbetsgivardeklaration', '["ab","ef","hb","ek"]', '[]', '{"type":"recurring","frequency":"monthly","day":12}', true, true, '7010-7099,7510,2710'),
('KU10', '2300', 'KU Lön och förmåner', 'Kontrolluppgifter', '["ab","ef","hb","ek"]', '[]', '{"type":"fixed","month":1,"day":31}', true, true, '7010-7019,7210-7290'),
('KU13', '2304', 'KU Ränta', 'Kontrolluppgifter', '["ab","hb"]', '[]', '{"type":"fixed","month":1,"day":31}', true, false, '8410-8419'),
('KU14', '2305', 'KU Utdelning', 'Kontrolluppgifter', '["ab"]', '[]', '{"type":"fixed","month":1,"day":31}', true, true, '2091-2098'),
('FA', '4001', 'Fastighetstaxering — Allmän', 'Fastighetstaxering', '["ab","ef"]', '[]', NULL, false, false, '1110-1119'),
('SKV4314', '4314', 'Preliminär inkomstdeklaration F-skatt', 'Särskilda deklarationer', '["ab","ef","hb","ek"]', '[]', NULL, true, false, NULL);
