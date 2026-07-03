-- Move all journal_entry_lines from account 3000 to account 3050
-- For each company, find the 3000 account_id and 3050 account_id, then update
UPDATE journal_entry_lines jel
SET account_id = target.id
FROM chart_of_accounts source, chart_of_accounts target
WHERE jel.account_id = source.id
  AND source.account_number = '3000'
  AND target.account_number = '3050'
  AND target.company_id = source.company_id;