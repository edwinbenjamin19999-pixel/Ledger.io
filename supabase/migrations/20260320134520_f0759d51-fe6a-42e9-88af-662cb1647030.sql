
-- Drop existing function with old signature
DROP FUNCTION IF EXISTS public.get_ai_learning_data(uuid, integer);

-- Function to get AI learning data from approved corrections and patterns
CREATE OR REPLACE FUNCTION public.get_ai_learning_data(_company_id uuid, _limit integer DEFAULT 50)
RETURNS TABLE(
  pattern text,
  suggested_account text,
  suggested_account_name text,
  correction_count bigint,
  avg_confidence numeric,
  last_used timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(af.document_pattern, af.correction_type) as pattern,
    (af.corrected_data->>'account_number')::text as suggested_account,
    (af.corrected_data->>'account_name')::text as suggested_account_name,
    COUNT(*)::bigint as correction_count,
    1.0::numeric as avg_confidence,
    MAX(af.created_at) as last_used
  FROM ai_feedback af
  WHERE af.company_id = _company_id
    AND af.corrected_data->>'account_number' IS NOT NULL
  GROUP BY af.document_pattern, af.correction_type, 
           af.corrected_data->>'account_number', af.corrected_data->>'account_name'
  
  UNION ALL
  
  SELECT 
    LOWER(SUBSTRING(je.description FROM 1 FOR 50)) as pattern,
    coa.account_number as suggested_account,
    coa.account_name as suggested_account_name,
    COUNT(*)::bigint as correction_count,
    COALESCE(AVG(je.ai_confidence), 0.8)::numeric as avg_confidence,
    MAX(je.created_at) as last_used
  FROM journal_entries je
  JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
  JOIN chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.company_id = _company_id
    AND je.status = 'approved'
    AND je.description IS NOT NULL
    AND jel.debit > 0
    AND coa.account_number NOT LIKE '19%'
    AND coa.account_number NOT LIKE '26%'
  GROUP BY LOWER(SUBSTRING(je.description FROM 1 FOR 50)), 
           coa.account_number, coa.account_name
  HAVING COUNT(*) >= 2
  
  ORDER BY correction_count DESC, last_used DESC
  LIMIT _limit;
END;
$$;

-- Function to auto-generate bank matching rules from repeated approved transactions
CREATE OR REPLACE FUNCTION public.auto_generate_matching_rules(_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_rule RECORD;
BEGIN
  FOR v_rule IN
    SELECT 
      bt.counterparty_name,
      bt.suggested_account_id,
      COUNT(*) as match_count,
      AVG(bt.ai_confidence) as avg_confidence
    FROM bank_transactions bt
    WHERE bt.company_id = _company_id
      AND bt.status = 'approved'
      AND bt.counterparty_name IS NOT NULL
      AND bt.suggested_account_id IS NOT NULL
      AND LENGTH(bt.counterparty_name) > 2
    GROUP BY bt.counterparty_name, bt.suggested_account_id
    HAVING COUNT(*) >= 3 AND AVG(bt.ai_confidence) >= 0.7
  LOOP
    INSERT INTO bank_matching_rules (
      company_id, rule_name, match_field, match_pattern,
      suggested_account_id, priority, auto_approve, is_active, created_by
    )
    SELECT 
      _company_id, 'Auto: ' || v_rule.counterparty_name, 'counterparty_name',
      v_rule.counterparty_name, v_rule.suggested_account_id, 50,
      v_rule.avg_confidence >= 0.9, true,
      (SELECT created_by FROM companies WHERE id = _company_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM bank_matching_rules 
      WHERE company_id = _company_id 
        AND match_pattern = v_rule.counterparty_name
        AND match_field = 'counterparty_name'
    );
    IF FOUND THEN v_count := v_count + 1; END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Function to get smart account suggestions based on description
CREATE OR REPLACE FUNCTION public.get_account_suggestions(
  _company_id uuid, _description text, _amount numeric DEFAULT NULL
)
RETURNS TABLE(
  account_id uuid, account_number text, account_name text,
  confidence numeric, reason text, usage_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _search_pattern text;
BEGIN
  _search_pattern := LOWER(COALESCE(_description, ''));
  
  RETURN QUERY
  SELECT DISTINCT ON (coa.account_number)
    coa.id as account_id,
    coa.account_number,
    coa.account_name,
    CASE
      WHEN af_match.correction_count > 0 THEN 0.95::numeric
      WHEN je_match.usage_count >= 5 THEN 0.9::numeric
      WHEN je_match.usage_count >= 2 THEN 0.8::numeric
      ELSE 0.6::numeric
    END as confidence,
    CASE
      WHEN af_match.correction_count > 0 THEN 'Baserat på tidigare korrigeringar'
      ELSE 'Baserat på ' || COALESCE(je_match.usage_count, 0) || ' liknande bokföringar'
    END as reason,
    COALESCE(je_match.usage_count, 0)::bigint as usage_count
  FROM chart_of_accounts coa
  LEFT JOIN (
    SELECT 
      (af.corrected_data->>'account_number')::text as acct_num,
      COUNT(*)::bigint as correction_count
    FROM ai_feedback af
    WHERE af.company_id = _company_id
      AND LOWER(COALESCE(af.document_pattern, '')) LIKE '%' || _search_pattern || '%'
    GROUP BY af.corrected_data->>'account_number'
  ) af_match ON af_match.acct_num = coa.account_number
  LEFT JOIN (
    SELECT 
      coa2.account_number as acct_num,
      COUNT(*)::bigint as usage_count
    FROM journal_entries je
    JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
    JOIN chart_of_accounts coa2 ON coa2.id = jel.account_id
    WHERE je.company_id = _company_id
      AND je.status = 'approved'
      AND jel.debit > 0
      AND coa2.account_number NOT LIKE '19%'
      AND coa2.account_number NOT LIKE '26%'
      AND LOWER(je.description) LIKE '%' || _search_pattern || '%'
    GROUP BY coa2.account_number
  ) je_match ON je_match.acct_num = coa.account_number
  WHERE coa.company_id = _company_id
    AND coa.is_active = true
    AND (af_match.correction_count > 0 OR COALESCE(je_match.usage_count, 0) >= 2)
  ORDER BY coa.account_number, confidence DESC
  LIMIT 5;
END;
$$;

-- Enable pg_trgm for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
