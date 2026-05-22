-- ============================================================
-- KHASANAH SARI BAKERY AIS — DATABASE RESET
-- Run this to completely clean and rebuild all data
-- WARNING: This deletes ALL existing data
-- ============================================================

-- Step 1: Clear all transactional data (keep structure)
TRUNCATE TABLE journal_entries      RESTART IDENTITY CASCADE;
TRUNCATE TABLE transaction_items    RESTART IDENTITY CASCADE;
TRUNCATE TABLE inventory_logs       RESTART IDENTITY CASCADE;
TRUNCATE TABLE transactions         RESTART IDENTITY CASCADE;

-- Step 2: Reset product stock to original values
UPDATE products SET stock = 42 WHERE sku = 'RB-001';
UPDATE products SET stock = 28 WHERE sku = 'PS-001';
UPDATE products SET stock =  6 WHERE sku = 'KU-001';
UPDATE products SET stock = 55 WHERE sku = 'RB-002';
UPDATE products SET stock = 19 WHERE sku = 'PS-002';
UPDATE products SET stock = 30 WHERE sku = 'MN-001';
UPDATE products SET stock = 40 WHERE sku = 'MN-002';
UPDATE products SET stock = 24 WHERE sku = 'PS-003';
UPDATE products SET stock =  9 WHERE sku = 'KU-002';
UPDATE products SET stock = 35 WHERE sku = 'RB-003';
UPDATE products SET stock =  7 WHERE sku = 'PS-004';
UPDATE products SET stock = 11 WHERE sku = 'KU-003';

-- Step 3: Seed clean transactions using generate_series
-- This ensures transactions and items are perfectly in sync
DO $$
DECLARE
  d   DATE;
  cnt INTEGER;
  i   INTEGER;
  j   INTEGER;
  tid VARCHAR(20);
  rno VARCHAR(30);
  mth VARCHAR(10);
  csh VARCHAR(30);
  pid INTEGER;
  pr  RECORD;
  qty INTEGER;
  sub NUMERIC;
  tot NUMERIC;
  tax NUMERIC;
  cogs_total NUMERIC;
  rev_by_cat JSONB;
  cash_acct  VARCHAR(10);
  rev_acct   VARCHAR(10);
  methods    TEXT[] := ARRAY['Cash','QRIS','GoPay','Debit'];
  cashiers   TEXT[] := ARRAY['Budi Santoso','Rina Wati','Doni Pratama'];
  cat_accts  TEXT[] := ARRAY['Bread:4010','Pastry:4020','Cake:4030','Beverage:4040'];
BEGIN

  FOR d IN SELECT generate_series('2026-04-01'::date, '2026-05-20'::date, '1 day'::interval)::date LOOP
    cnt := 10 + (RANDOM() * 8)::INTEGER;

    FOR i IN 1..cnt LOOP
      -- Generate IDs
      tid := UPPER(SUBSTRING(MD5(d::text || i::text || RANDOM()::text), 1, 8));
      rno := 'RCP-' || UPPER(SUBSTRING(MD5(tid || 'r'), 1, 7));
      mth := methods[1 + (RANDOM() * 3)::INTEGER];
      csh := cashiers[1 + (RANDOM() * 2)::INTEGER];

      sub := 0;
      cogs_total := 0;
      rev_by_cat := '{}'::JSONB;

      -- Insert transaction header (with 0 values, will update later)
      INSERT INTO transactions(id, transaction_date, transaction_time, cashier_name,
        subtotal, tax, total, payment_method, receipt_no, verified)
      VALUES(tid, d,
        ('08:00:00'::TIME + (RANDOM() * INTERVAL '12 hours'))::TIME,
        csh, 0, 0, 0, mth, rno, TRUE);

      -- Insert 2–4 items per transaction
      FOR j IN 1..(2 + (RANDOM() * 2)::INTEGER) LOOP
        pid := 1 + (RANDOM() * 11)::INTEGER;
        SELECT * INTO pr FROM products WHERE id = pid;
        IF NOT FOUND THEN CONTINUE; END IF;
        qty := 1 + (RANDOM() * 2)::INTEGER;

        INSERT INTO transaction_items(transaction_id, product_id, product_name, category,
          quantity, unit_price, unit_cost, line_total)
        VALUES(tid, pr.id, pr.name, pr.category, qty, pr.price, pr.cost, pr.price * qty);

        sub        := sub + pr.price * qty;
        cogs_total := cogs_total + pr.cost * qty;

        -- Accumulate revenue by category
        rev_by_cat := JSONB_SET(rev_by_cat, ARRAY[pr.category],
          TO_JSONB(COALESCE((rev_by_cat ->> pr.category)::NUMERIC, 0) + pr.price * qty));
      END LOOP;

      tax := ROUND(sub * 0.11);
      tot := sub + tax;

      -- Update transaction totals
      UPDATE transactions SET subtotal=sub, tax=tax, total=tot WHERE id=tid;

      -- === POST JOURNAL ENTRIES ===
      -- Map payment to cash account
      cash_acct := CASE mth
        WHEN 'Cash'  THEN '1010'
        WHEN 'Debit' THEN '1020'
        WHEN 'QRIS'  THEN '1030'
        WHEN 'GoPay' THEN '1040'
        ELSE '1010'
      END;

      -- Dr. Cash/Bank/QRIS/GoPay (total incl VAT)
      INSERT INTO journal_entries(entry_date,description,account_code,debit,credit,reference_no,posted_by)
      VALUES(d, 'Sale ' || rno, cash_acct, tot, 0, rno, 'System');

      -- Cr. VAT Payable
      INSERT INTO journal_entries(entry_date,description,account_code,debit,credit,reference_no,posted_by)
      VALUES(d, 'VAT ' || rno, '2030', 0, tax, rno, 'System');

      -- Cr. Revenue by category
      FOR rev_acct IN SELECT UNNEST(ARRAY['4010','4020','4030','4040']) LOOP
        DECLARE
          cat_name TEXT := CASE rev_acct
            WHEN '4010' THEN 'Bread' WHEN '4020' THEN 'Pastry'
            WHEN '4030' THEN 'Cake'  WHEN '4040' THEN 'Beverage' END;
          amt NUMERIC := COALESCE((rev_by_cat ->> cat_name)::NUMERIC, 0);
        BEGIN
          IF amt > 0 THEN
            INSERT INTO journal_entries(entry_date,description,account_code,debit,credit,reference_no,posted_by)
            VALUES(d, cat_name || ' Revenue ' || rno, rev_acct, 0, amt, rno, 'System');
          END IF;
        END;
      END LOOP;

      -- Dr. COGS
      INSERT INTO journal_entries(entry_date,description,account_code,debit,credit,reference_no,posted_by)
      VALUES(d, 'COGS ' || rno, '5010', cogs_total, 0, rno, 'System');

      -- Cr. Inventory
      INSERT INTO journal_entries(entry_date,description,account_code,debit,credit,reference_no,posted_by)
      VALUES(d, 'Inventory ' || rno, '1220', 0, cogs_total, rno, 'System');

    END LOOP;
  END LOOP;
END $$;

-- Step 4: Add fixed monthly operating expense journal entries
-- April 2026
INSERT INTO journal_entries(entry_date,description,account_code,debit,credit,reference_no,posted_by) VALUES
('2026-04-30','Salary Expense April 2026','6010',8500000,0,'ADJ-APR-01','System'),
('2026-04-30','Salary Payable April 2026','2010',0,8500000,'ADJ-APR-01','System'),
('2026-04-30','Rent Expense April 2026','6020',5000000,0,'ADJ-APR-02','System'),
('2026-04-30','Rent Paid April 2026','1010',0,5000000,'ADJ-APR-02','System'),
('2026-04-30','Utilities Expense April 2026','6030',1800000,0,'ADJ-APR-03','System'),
('2026-04-30','Utilities Paid April 2026','1010',0,1800000,'ADJ-APR-03','System'),
('2026-04-30','Depreciation Expense April 2026','6040',600000,0,'ADJ-APR-04','System'),
('2026-04-30','Accumulated Depreciation April 2026','1520',0,600000,'ADJ-APR-04','System');

-- May 2026 (partial — prorated to 20 days = 20/31 of monthly)
INSERT INTO journal_entries(entry_date,description,account_code,debit,credit,reference_no,posted_by) VALUES
('2026-05-20','Salary Expense May 2026','6010',5483871,0,'ADJ-MAY-01','System'),
('2026-05-20','Salary Payable May 2026','2010',0,5483871,'ADJ-MAY-01','System'),
('2026-05-20','Rent Expense May 2026','6020',3225806,0,'ADJ-MAY-02','System'),
('2026-05-20','Rent Paid May 2026','1010',0,3225806,'ADJ-MAY-02','System'),
('2026-05-20','Utilities Expense May 2026','6030',1161290,0,'ADJ-MAY-03','System'),
('2026-05-20','Utilities Paid May 2026','1010',0,1161290,'ADJ-MAY-03','System'),
('2026-05-20','Depreciation Expense May 2026','6040',387097,0,'ADJ-MAY-04','System'),
('2026-05-20','Accumulated Depreciation May 2026','1520',0,387097,'ADJ-MAY-04','System');

-- Step 5: Add Owner's Capital opening entry
INSERT INTO journal_entries(entry_date,description,account_code,debit,credit,reference_no,posted_by) VALUES
('2026-04-01','Opening Balance — Cash','1010',150000000,0,'OPN-001','System'),
('2026-04-01','Opening Balance — Equipment','1510',18000000,0,'OPN-002','System'),
('2026-04-01','Opening Balance — Owner Capital','3010',0,150000000,'OPN-001','System'),
('2026-04-01','Opening Balance — Equipment Capital','3010',0,18000000,'OPN-002','System');

-- Step 6: Verify — check balance
SELECT
  EXTRACT(MONTH FROM entry_date) AS month,
  EXTRACT(YEAR  FROM entry_date) AS year,
  SUM(debit)  AS total_debit,
  SUM(credit) AS total_credit,
  SUM(debit) - SUM(credit) AS diff
FROM journal_entries
GROUP BY month, year
ORDER BY year, month;

-- Check transaction vs items alignment
SELECT
  EXTRACT(MONTH FROM t.transaction_date) AS month,
  COUNT(DISTINCT t.id)   AS transactions,
  COUNT(ti.id)           AS items,
  SUM(t.total)           AS txn_revenue,
  SUM(ti.line_total)     AS items_revenue,
  SUM(t.total) - SUM(ti.line_total) * 1.11 AS diff
FROM transactions t
LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
GROUP BY month ORDER BY month;

SELECT 'Database reset complete!' AS status;
