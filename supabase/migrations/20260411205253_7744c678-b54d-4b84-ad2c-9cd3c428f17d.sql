
CREATE TABLE IF NOT EXISTS esg_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  scope1_co2_tonnes NUMERIC(10,2) DEFAULT 0,
  scope2_co2_tonnes NUMERIC(10,2) DEFAULT 0,
  scope3_co2_tonnes NUMERIC(10,2) DEFAULT 0,
  energy_kwh NUMERIC(15,2) DEFAULT 0,
  renewable_energy_percent NUMERIC(5,2) DEFAULT 0,
  water_m3 NUMERIC(10,2) DEFAULT 0,
  waste_tonnes NUMERIC(10,2) DEFAULT 0,
  recycled_percent NUMERIC(5,2) DEFAULT 0,
  female_board_percent NUMERIC(5,2) DEFAULT 0,
  employee_turnover_percent NUMERIC(5,2) DEFAULT 0,
  sick_days_per_employee NUMERIC(5,2) DEFAULT 0,
  social_investment_sek NUMERIC(15,2) DEFAULT 0,
  has_code_of_conduct BOOLEAN DEFAULT false,
  has_whistleblower BOOLEAN DEFAULT false,
  anti_corruption_training_percent NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, year)
);

ALTER TABLE esg_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esg_data_select" ON esg_data
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "esg_data_insert" ON esg_data
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "esg_data_update" ON esg_data
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "esg_data_delete" ON esg_data
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())
  );
