-- Holland Bakery AIS - PostgreSQL Schema & Seed Data
-- Encoding: UTF-8 (ASCII-safe, no emoji, no special chars)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS inventory_logs CASCADE;
DROP TABLE IF EXISTS transaction_items CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS chart_of_accounts CASCADE;

-- USERS
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('cashier','supervisor','accountant','manager')),
  pin VARCHAR(10) NOT NULL,
  outlet VARCHAR(100) DEFAULT 'Grand Indonesia',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('Bread','Pastry','Cake','Beverage')),
  price NUMERIC(12,2) NOT NULL,
  cost NUMERIC(12,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER NOT NULL DEFAULT 5,
  sku VARCHAR(30) UNIQUE NOT NULL,
  supplier VARCHAR(150) DEFAULT '',
  emoji VARCHAR(10) DEFAULT '',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRANSACTIONS
CREATE TABLE transactions (
  id VARCHAR(20) PRIMARY KEY,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_time TIME NOT NULL DEFAULT CURRENT_TIME,
  cashier_name VARCHAR(100) NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL,
  tax NUMERIC(14,2) NOT NULL,
  total NUMERIC(14,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('Cash','QRIS','GoPay','Debit')),
  receipt_no VARCHAR(30) UNIQUE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRANSACTION ITEMS
CREATE TABLE transaction_items (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(20) REFERENCES transactions(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  product_name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL,
  line_total NUMERIC(14,2) NOT NULL
);

-- INVENTORY LOGS
CREATE TABLE inventory_logs (
  id SERIAL PRIMARY KEY,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  log_time TIME NOT NULL DEFAULT CURRENT_TIME,
  product_id INTEGER REFERENCES products(id),
  product_name VARCHAR(150) NOT NULL,
  movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('Sale','Restock','Adjustment','Damage','Return')),
  quantity_change INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  reason TEXT DEFAULT '',
  performed_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHART OF ACCOUNTS
CREATE TABLE chart_of_accounts (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('Asset','Liability','Equity','Revenue','Expense')),
  normal_balance VARCHAR(5) NOT NULL CHECK (normal_balance IN ('D','K')),
  description TEXT DEFAULT ''
);

-- JOURNAL ENTRIES
CREATE TABLE journal_entries (
  id SERIAL PRIMARY KEY,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  account_code VARCHAR(10) REFERENCES chart_of_accounts(code),
  debit NUMERIC(14,2) DEFAULT 0,
  credit NUMERIC(14,2) DEFAULT 0,
  reference_no VARCHAR(30),
  posted_by VARCHAR(100) DEFAULT 'System',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_payment ON transactions(payment_method);
CREATE INDEX idx_items_transaction ON transaction_items(transaction_id);
CREATE INDEX idx_items_product ON transaction_items(product_id);
CREATE INDEX idx_invlogs_date ON inventory_logs(log_date);
CREATE INDEX idx_journal_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_account ON journal_entries(account_code);

-- SEED: USERS
INSERT INTO users (name, role, pin, outlet) VALUES
('Budi Santoso',  'cashier',    '1234', 'Grand Indonesia'),
('Siti Rahayu',   'supervisor', '2345', 'Grand Indonesia'),
('Ahmad Fauzi',   'accountant', '3456', 'HQ Jakarta'),
('Dewi Lestari',  'manager',    '4567', 'HQ Jakarta');

-- SEED: CHART OF ACCOUNTS
INSERT INTO chart_of_accounts (code, name, account_type, normal_balance) VALUES
('1010', 'Cash on Hand',              'Asset',     'D'),
('1020', 'Bank BCA',                  'Asset',     'D'),
('1030', 'QRIS Receivable',           'Asset',     'D'),
('1040', 'GoPay Balance',             'Asset',     'D'),
('1220', 'Inventory',                 'Asset',     'D'),
('1510', 'Equipment',                 'Asset',     'D'),
('1520', 'Accumulated Depreciation',  'Asset',     'K'),
('2010', 'Accounts Payable',          'Liability', 'K'),
('2030', 'Tax Payable (VAT)',          'Liability', 'K'),
('3010', 'Owners Capital',            'Equity',    'K'),
('3020', 'Retained Earnings',         'Equity',    'K'),
('4010', 'Bread Revenue',             'Revenue',   'K'),
('4020', 'Pastry Revenue',            'Revenue',   'K'),
('4030', 'Cake Revenue',              'Revenue',   'K'),
('4040', 'Beverage Revenue',          'Revenue',   'K'),
('5010', 'COGS - Raw Materials',      'Expense',   'D'),
('6010', 'Salary Expense',            'Expense',   'D'),
('6020', 'Rent Expense',              'Expense',   'D'),
('6030', 'Utilities Expense',         'Expense',   'D'),
('6040', 'Depreciation Expense',      'Expense',   'D'),
('6050', 'QRIS/MDR Fee',              'Expense',   'D');

-- SEED: PRODUCTS (no emoji in SQL, emoji set via UPDATE after)
INSERT INTO products (name, category, price, cost, stock, reorder_point, sku, supplier, emoji) VALUES
('Chocolate Special Bread',  'Bread',    18500,  7000,  42, 10, 'RB-001', 'PT Indofood Bakery',   ''),
('Butter Croissant',         'Pastry',   22000,  8500,  28,  8, 'PS-001', 'Bogasari Flour Mills',  ''),
('Black Forest Cake',        'Cake',    185000, 72000,   6,  3, 'KU-001', 'Internal Production',  ''),
('Cheese Milk Bread',        'Bread',    16500,  6000,  55, 12, 'RB-002', 'PT Indofood Bakery',   ''),
('Strawberry Danish',        'Pastry',   24000,  9000,  19,  8, 'PS-002', 'Bogasari Flour Mills',  ''),
('Bakery Milk Coffee',       'Beverage', 28000,  9500,  30, 10, 'MN-001', 'Kapal Api',            ''),
('Lemon Iced Tea',           'Beverage', 15000,  4500,  40, 12, 'MN-002', 'Sosro',                ''),
('Blueberry Muffin',         'Pastry',   19500,  7200,  24,  8, 'PS-003', 'Bogasari Flour Mills',  ''),
('Fresh Fruit Tart',         'Cake',     45000, 17000,   9,  4, 'KU-002', 'Internal Production',  ''),
('Whole Wheat Bread',        'Bread',    32000, 11000,  35, 10, 'RB-003', 'PT Indofood Bakery',   ''),
('Sugar Donut',              'Pastry',   12000,  4000,   7, 10, 'PS-004', 'Bogasari Flour Mills',  ''),
('Lemon Cake Slice',         'Cake',     38000, 14000,  11,  4, 'KU-003', 'Internal Production',  '');

-- SEED: TRANSACTIONS (30 days, May 2025)
-- Using pure SQL INSERT loops via generate_series for compatibility
DO $$
DECLARE
  day_num INTEGER;
  txn_num INTEGER;
  txn_count INTEGER;
  txn_id TEXT;
  receipt TEXT;
  method TEXT;
  cashier TEXT;
  prod_id INTEGER;
  qty INTEGER;
  uprice NUMERIC;
  ucost NUMERIC;
  pcat TEXT;
  pname TEXT;
  sub NUMERIC;
  itm_sub NUMERIC;
  tax_amt NUMERIC;
  num_items INTEGER;
  methods TEXT[] := ARRAY['Cash','QRIS','GoPay','Debit'];
  cashiers TEXT[] := ARRAY['Budi Santoso','Rina Wati','Doni Pratama'];
  prod_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO prod_count FROM products;
  IF prod_count = 0 THEN
    RAISE NOTICE 'No products found, skipping transaction seed';
    RETURN;
  END IF;

  FOR day_num IN 1..30 LOOP
    txn_count := 8 + (RANDOM() * 11)::INTEGER;
    FOR txn_num IN 1..txn_count LOOP
      txn_id := upper(substring(md5(random()::text), 1, 8));
      receipt := 'RCP-' || upper(substring(md5(random()::text), 1, 7));
      method  := methods[1 + (random()*3)::INTEGER];
      cashier := cashiers[1 + (random()*2)::INTEGER];
      sub := 0;
      num_items := 1 + (random()*3)::INTEGER;

      INSERT INTO transactions (id, transaction_date, transaction_time, cashier_name,
        subtotal, tax, total, payment_method, receipt_no, verified)
      VALUES (
        txn_id,
        ('2025-05-' || lpad(day_num::text, 2, '0'))::DATE,
        ('08:00:00'::TIME + (random() * INTERVAL '10 hours'))::TIME,
        cashier, 0, 0, 0, method, receipt, TRUE
      );

      FOR i IN 1..num_items LOOP
        prod_id := 1 + (random() * 11)::INTEGER;
        SELECT price, cost, category, name
          INTO uprice, ucost, pcat, pname
          FROM products WHERE id = prod_id;
        IF NOT FOUND THEN CONTINUE; END IF;
        qty := 1 + (random() * 2)::INTEGER;
        itm_sub := uprice * qty;
        sub := sub + itm_sub;
        INSERT INTO transaction_items
          (transaction_id, product_id, product_name, category, quantity, unit_price, unit_cost, line_total)
        VALUES (txn_id, prod_id, pname, pcat, qty, uprice, ucost, itm_sub);
      END LOOP;

      tax_amt := round(sub * 0.11);
      UPDATE transactions SET subtotal=sub, tax=tax_amt, total=sub+tax_amt WHERE id=txn_id;
    END LOOP;
  END LOOP;
END $$;

-- AUTO-UPDATE trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Verify
SELECT 'Schema loaded OK' AS status;
SELECT COUNT(*) AS total_transactions FROM transactions;
SELECT COUNT(*) AS total_products FROM products;
