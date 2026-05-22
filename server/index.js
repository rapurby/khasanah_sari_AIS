// ============================================================
// KHASANAH SARI BAKERY AIS — Express Backend Server v2.1
// Fixed: timezone (WIB UTC+7), period filters, date handling
// ============================================================
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { Pool } = require('pg');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 4000;

// ─── WIB TIMEZONE HELPER ────────────────────────────────────
// Always use WIB (UTC+7) for current date/time, not server UTC
const wibNow = () => {
  const now = new Date();
  // Add 7 hours offset for WIB
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib;
};
const wibDateStr = () => wibNow().toISOString().split('T')[0]; // "YYYY-MM-DD"
const wibTimeStr = () => wibNow().toISOString().split('T')[1].slice(0,8); // "HH:MM:SS"

// ─── DATABASE CONNECTION ────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.connect()
  .then(() => console.log('✅ PostgreSQL connected'))
  .catch(err => console.error('❌ DB connection error:', err.message));

// ─── MIDDLEWARE ─────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*', methods: ['GET','POST','PUT','DELETE','PATCH'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// ─── HEALTH CHECK ───────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time');
    res.json({ status: 'ok', db: 'connected', server_utc: result.rows[0].time, wib_date: wibDateStr(), wib_time: wibTimeStr() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ============================================================
// AUTH
// ============================================================
app.post('/api/auth/login', async (req, res) => {
  const { role, pin } = req.body;
  try {
    const result = await pool.query('SELECT id, name, role, outlet FROM users WHERE role=$1 AND pin=$2', [role, pin]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid PIN' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// PRODUCTS
// ============================================================
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE active=TRUE ORDER BY category, name');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', async (req, res) => {
  const { name, category, price, cost, stock, reorder_point, sku, supplier, emoji } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO products (name,category,price,cost,stock,reorder_point,sku,supplier,emoji) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, category, price, cost, stock, reorder_point, sku, supplier||'', emoji||'']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, price, cost, stock, reorder_point, sku, supplier, emoji } = req.body;
  try {
    const result = await pool.query(
      `UPDATE products SET name=$1,category=$2,price=$3,cost=$4,stock=$5,reorder_point=$6,sku=$7,supplier=$8,emoji=$9,updated_at=NOW() WHERE id=$10 RETURNING *`,
      [name, category, price, cost, stock, reorder_point, sku, supplier, emoji, id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.query('UPDATE products SET active=FALSE WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/products/:id/adjust-stock', async (req, res) => {
  const { id } = req.params;
  const { qty_change, reason, performed_by, movement_type } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const prod = await client.query('SELECT * FROM products WHERE id=$1 FOR UPDATE', [id]);
    const product = prod.rows[0];
    const new_stock = Math.max(0, product.stock + qty_change);
    await client.query('UPDATE products SET stock=$1,updated_at=NOW() WHERE id=$2', [new_stock, id]);
    // Use WIB date/time
    await client.query(
      `INSERT INTO inventory_logs (log_date,log_time,product_id,product_name,movement_type,quantity_change,stock_after,reason,performed_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [wibDateStr(), wibTimeStr(), id, product.name, movement_type||'Adjustment', qty_change, new_stock, reason||'', performed_by||'System']
    );
    await client.query('COMMIT');
    res.json({ success: true, new_stock, product_name: product.name });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// ============================================================
// TRANSACTIONS
// ============================================================
app.get('/api/transactions', async (req, res) => {
  const { date, month, year, limit = 500, offset = 0 } = req.query;
  try {
    let query = `
      SELECT t.*,
        JSON_AGG(JSON_BUILD_OBJECT(
          'product_id', ti.product_id, 'name', ti.product_name,
          'qty', ti.quantity, 'price', ti.unit_price, 'cost', ti.unit_cost,
          'cat', ti.category, 'line_total', ti.line_total
        ) ORDER BY ti.id) AS items
      FROM transactions t
      LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
    `;
    const params = [];
    const conditions = [];

    if (date)  { conditions.push(`t.transaction_date = $${params.length+1}`); params.push(date); }
    if (month && year) {
      conditions.push(`EXTRACT(MONTH FROM t.transaction_date) = $${params.length+1}`); params.push(parseInt(month));
      conditions.push(`EXTRACT(YEAR  FROM t.transaction_date) = $${params.length+1}`); params.push(parseInt(year));
    } else if (year) {
      conditions.push(`EXTRACT(YEAR FROM t.transaction_date) = $${params.length+1}`); params.push(parseInt(year));
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' GROUP BY t.id ORDER BY t.transaction_date DESC, t.transaction_time DESC';
    query += ` LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows.map(r => ({
      ...r,
      date: r.transaction_date instanceof Date ? r.transaction_date.toISOString().split('T')[0] : String(r.transaction_date).split('T')[0],
      time: typeof r.transaction_time === 'string' ? r.transaction_time.slice(0,5) : String(r.transaction_time||'').slice(0,5),
      payment: r.payment_method,
      receiptNo: r.receipt_no,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create sale transaction — uses WIB date/time
app.post('/api/transactions', async (req, res) => {
  const { id, cashier_name, items, subtotal, tax, total, payment_method, receipt_no } = req.body;
  const txnDate = wibDateStr();
  const txnTime = wibTimeStr();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO transactions (id,transaction_date,transaction_time,cashier_name,subtotal,tax,total,payment_method,receipt_no,verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,FALSE)`,
      [id, txnDate, txnTime, cashier_name, subtotal, tax, total, payment_method, receipt_no]
    );

    const cashAccountMap = { Cash:'1010', QRIS:'1030', GoPay:'1040', Debit:'1020' };
    const revAccountMap  = { Bread:'4010', Pastry:'4020', Cake:'4030', Beverage:'4040' };
    const cashAccount    = cashAccountMap[payment_method] || '1010';

    for (const item of items) {
      await client.query(
        `INSERT INTO transaction_items (transaction_id,product_id,product_name,category,quantity,unit_price,unit_cost,line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, item.productId, item.name, item.cat, item.qty, item.price, item.cost, item.price*item.qty]
      );
      await client.query('UPDATE products SET stock=GREATEST(0,stock-$1),updated_at=NOW() WHERE id=$2', [item.qty, item.productId]);
      const prod = await client.query('SELECT stock FROM products WHERE id=$1', [item.productId]);
      await client.query(
        `INSERT INTO inventory_logs (log_date,log_time,product_id,product_name,movement_type,quantity_change,stock_after,reason,performed_by)
         VALUES ($1,$2,$3,$4,'Sale',$5,$6,$7,$8)`,
        [txnDate, txnTime, item.productId, item.name, -item.qty, prod.rows[0].stock, `Sale: ${receipt_no}`, cashier_name]
      );
    }

    // Journal entries — use WIB date
    await client.query(
      `INSERT INTO journal_entries (entry_date,description,account_code,debit,credit,reference_no,posted_by) VALUES ($1,$2,$3,$4,0,$5,'System')`,
      [txnDate, `Sale ${receipt_no}`, cashAccount, total, receipt_no]
    );
    const revenueByCategory = {};
    for (const item of items) { revenueByCategory[item.cat] = (revenueByCategory[item.cat]||0) + item.price*item.qty; }
    for (const [cat, amt] of Object.entries(revenueByCategory)) {
      await client.query(
        `INSERT INTO journal_entries (entry_date,description,account_code,debit,credit,reference_no,posted_by) VALUES ($1,$2,$3,0,$4,$5,'System')`,
        [txnDate, `${cat} Revenue ${receipt_no}`, revAccountMap[cat]||'4010', amt, receipt_no]
      );
    }
    await client.query(
      `INSERT INTO journal_entries (entry_date,description,account_code,debit,credit,reference_no,posted_by) VALUES ($1,$2,'2030',0,$3,$4,'System')`,
      [txnDate, `VAT ${receipt_no}`, tax, receipt_no]
    );
    const totalCOGS = items.reduce((s,i)=>s+i.cost*i.qty, 0);
    await client.query(
      `INSERT INTO journal_entries (entry_date,description,account_code,debit,credit,reference_no,posted_by) VALUES ($1,$2,'5010',$3,0,$4,'System')`,
      [txnDate, `COGS ${receipt_no}`, totalCOGS, receipt_no]
    );
    await client.query(
      `INSERT INTO journal_entries (entry_date,description,account_code,debit,credit,reference_no,posted_by) VALUES ($1,$2,'1220',0,$3,$4,'System')`,
      [txnDate, `Inventory reduction ${receipt_no}`, totalCOGS, receipt_no]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, id, receipt_no, date: txnDate, time: txnTime });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// ============================================================
// INVENTORY LOGS
// ============================================================
app.get('/api/inventory-logs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory_logs ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows.map(r => ({
      ...r,
      date: r.log_date instanceof Date ? r.log_date.toISOString().split('T')[0] : String(r.log_date||'').split('T')[0],
      time: typeof r.log_time === 'string' ? r.log_time.slice(0,5) : String(r.log_time||'').slice(0,5),
      type: r.movement_type,
      product: r.product_name,
      qty: Math.abs(r.quantity_change||0),
      by: r.performed_by,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// ACCOUNTING
// ============================================================
app.get('/api/journal-entries', async (req, res) => {
  const { month, year, limit = 500 } = req.query;
  try {
    let query = 'SELECT * FROM journal_entries';
    const params = [];
    const conditions = [];
    if (month && year) {
      conditions.push(`EXTRACT(MONTH FROM entry_date)=$${params.length+1}`); params.push(parseInt(month));
      conditions.push(`EXTRACT(YEAR FROM entry_date)=$${params.length+1}`);  params.push(parseInt(year));
    } else if (year) {
      conditions.push(`EXTRACT(YEAR FROM entry_date)=$${params.length+1}`); params.push(parseInt(year));
    }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ` ORDER BY entry_date DESC, id DESC LIMIT $${params.length+1}`;
    params.push(limit);
    const result = await pool.query(query, params);
    res.json(result.rows.map(r => ({
      ...r,
      date: r.entry_date instanceof Date ? r.entry_date.toISOString().split('T')[0] : String(r.entry_date||'').split('T')[0],
      desc: r.description,
      account: r.account_code,
      ref: r.reference_no,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/general-ledger', async (req, res) => {
  const { month, year } = req.query;
  try {
    let joinCondition = 'j.account_code = c.code';
    const params = [];
    if (month && year) {
      joinCondition += ` AND EXTRACT(MONTH FROM j.entry_date)=$${params.length+1} AND EXTRACT(YEAR FROM j.entry_date)=$${params.length+2}`;
      params.push(parseInt(month), parseInt(year));
    } else if (year) {
      joinCondition += ` AND EXTRACT(YEAR FROM j.entry_date)=$${params.length+1}`;
      params.push(parseInt(year));
    }
    const result = await pool.query(`
      SELECT c.code, c.name, c.account_type AS type, c.normal_balance AS normal,
        COALESCE(SUM(j.debit),0) AS debit,
        COALESCE(SUM(j.credit),0) AS credit,
        CASE WHEN c.normal_balance='D'
          THEN COALESCE(SUM(j.debit),0) - COALESCE(SUM(j.credit),0)
          ELSE COALESCE(SUM(j.credit),0) - COALESCE(SUM(j.debit),0)
        END AS balance
      FROM chart_of_accounts c
      LEFT JOIN journal_entries j ON ${joinCondition}
      GROUP BY c.code, c.name, c.account_type, c.normal_balance
      HAVING COALESCE(SUM(j.debit),0) > 0 OR COALESCE(SUM(j.credit),0) > 0
      ORDER BY c.code
    `, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/chart-of-accounts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chart_of_accounts ORDER BY code');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// REPORTS — with period filter (month + year)
// ============================================================
app.get('/api/reports/summary', async (req, res) => {
  const { month, year } = req.query;
  try {
    // Build date filter
    let dateFilter = '';
    const params = [];
    if (month && year) {
      dateFilter = `WHERE EXTRACT(MONTH FROM t.transaction_date)=$${params.length+1} AND EXTRACT(YEAR FROM t.transaction_date)=$${params.length+2}`;
      params.push(parseInt(month), parseInt(year));
    } else if (year) {
      dateFilter = `WHERE EXTRACT(YEAR FROM t.transaction_date)=$${params.length+1}`;
      params.push(parseInt(year));
    }

    const itemFilter = dateFilter.replace(/t\.transaction_date/g, 'tx.transaction_date').replace('WHERE','WHERE');
    const itemJoinFilter = (month && year)
      ? `WHERE EXTRACT(MONTH FROM tx.transaction_date)=$1 AND EXTRACT(YEAR FROM tx.transaction_date)=$2`
      : year ? `WHERE EXTRACT(YEAR FROM tx.transaction_date)=$1` : '';

    const revenue = await pool.query(
      `SELECT COALESCE(SUM(ti.line_total),0) AS total_revenue FROM transaction_items ti JOIN transactions tx ON tx.id=ti.transaction_id ${itemJoinFilter}`,
      params
    );
    const cogs = await pool.query(
      `SELECT COALESCE(SUM(ti.unit_cost*ti.quantity),0) AS total_cogs FROM transaction_items ti JOIN transactions tx ON tx.id=ti.transaction_id ${itemJoinFilter}`,
      params
    );
    const txnCount = await pool.query(`SELECT COUNT(*) AS count FROM transactions t ${dateFilter}`, params);
    const byPayment = await pool.query(
      `SELECT payment_method, COUNT(*) AS count, SUM(total) AS total FROM transactions t ${dateFilter} GROUP BY payment_method`,
      params
    );
    const byCategory = await pool.query(
      `SELECT ti.category, SUM(ti.line_total) AS revenue FROM transaction_items ti JOIN transactions tx ON tx.id=ti.transaction_id ${itemJoinFilter} GROUP BY ti.category ORDER BY revenue DESC`,
      params
    );
    const daily = await pool.query(
      `SELECT transaction_date AS date, SUM(total) AS total, COUNT(*) AS count FROM transactions t ${dateFilter} GROUP BY transaction_date ORDER BY transaction_date`,
      params
    );

    // Available periods (distinct year-month combos)
    const periods = await pool.query(
      `SELECT DISTINCT EXTRACT(YEAR FROM transaction_date) AS year, EXTRACT(MONTH FROM transaction_date) AS month
       FROM transactions ORDER BY year DESC, month DESC`
    );

    const totalRev  = parseFloat(revenue.rows[0].total_revenue);
    const totalCOGS = parseFloat(cogs.rows[0].total_cogs);
    const fixedExpenses = { salary:8500000, rent:5000000, utilities:1800000, depreciation:600000 };
    const qrisFee   = Math.round(totalRev * 0.007);
    const totalOpEx = Object.values(fixedExpenses).reduce((s,v)=>s+v,0) + qrisFee;

    res.json({
      totalRevenue: totalRev, totalCOGS,
      grossProfit: totalRev - totalCOGS,
      totalOpEx, netIncome: totalRev - totalCOGS - totalOpEx,
      transactionCount: parseInt(txnCount.rows[0].count),
      byPayment: byPayment.rows,
      byCategory: byCategory.rows,
      daily: daily.rows.map(r => ({
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date||'').split('T')[0],
        total: parseFloat(r.total), count: parseInt(r.count),
      })),
      expenses: { ...fixedExpenses, qrisFee },
      availablePeriods: periods.rows.map(r => ({ year: parseInt(r.year), month: parseInt(r.month) })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Cash Receipt — uses WIB date by default
app.get('/api/reports/cash-receipt', async (req, res) => {
  const { date } = req.query;
  const targetDate = date || wibDateStr(); // use WIB date, not UTC
  try {
    const result = await pool.query(`
      SELECT t.*, JSON_AGG(JSON_BUILD_OBJECT(
        'name', ti.product_name, 'qty', ti.quantity,
        'price', ti.unit_price, 'line_total', ti.line_total
      )) AS items
      FROM transactions t
      LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
      WHERE t.transaction_date = $1
      GROUP BY t.id ORDER BY t.transaction_time
    `, [targetDate]);

    const byMethod = {};
    result.rows.forEach(r => {
      byMethod[r.payment_method] = (byMethod[r.payment_method]||0) + parseFloat(r.total);
    });

    res.json({
      date: targetDate,
      transactions: result.rows.map(r => ({
        ...r,
        date: r.transaction_date instanceof Date ? r.transaction_date.toISOString().split('T')[0] : String(r.transaction_date||'').split('T')[0],
        time: typeof r.transaction_time === 'string' ? r.transaction_time.slice(0,5) : String(r.transaction_time||'').slice(0,5),
        receiptNo: r.receipt_no, payment: r.payment_method,
      })),
      byMethod,
      total: Object.values(byMethod).reduce((s,v)=>s+v, 0),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/reports/cash-receipt/verify', async (req, res) => {
  const { date, verified_by } = req.body;
  try {
    await pool.query('UPDATE transactions SET verified=TRUE WHERE transaction_date=$1', [date || wibDateStr()]);
    res.json({ success: true, verified_by, date });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AVAILABLE PERIODS (for dropdown) ───────────────────────
app.get('/api/periods', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT EXTRACT(YEAR FROM transaction_date) AS year, EXTRACT(MONTH FROM transaction_date) AS month
       FROM transactions ORDER BY year DESC, month DESC`
    );
    res.json(result.rows.map(r => ({ year: parseInt(r.year), month: parseInt(r.month) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// RAW MATERIALS (BAHAN BAKU / INGREDIENTS)
// ============================================================
app.get('/api/raw-materials', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM raw_materials ORDER BY category, name');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/raw-materials', async (req, res) => {
  const { name, category, unit, stock_qty, reorder_point, unit_cost, supplier } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO raw_materials (name,category,unit,stock_qty,reorder_point,unit_cost,supplier)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, category, unit, stock_qty||0, reorder_point||5, unit_cost||0, supplier||'']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/raw-materials/:id', async (req, res) => {
  const { name, category, unit, stock_qty, reorder_point, unit_cost, supplier } = req.body;
  try {
    const r = await pool.query(
      `UPDATE raw_materials SET name=$1,category=$2,unit=$3,stock_qty=$4,
       reorder_point=$5,unit_cost=$6,supplier=$7,updated_at=NOW() WHERE id=$8 RETURNING *`,
      [name, category, unit, stock_qty, reorder_point, unit_cost, supplier, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/raw-materials/:id/adjust', async (req, res) => {
  const { qty_change, reason, performed_by } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rm = await client.query('SELECT * FROM raw_materials WHERE id=$1 FOR UPDATE', [req.params.id]);
    const mat = rm.rows[0];
    const new_qty = Math.max(0, parseFloat(mat.stock_qty) + parseFloat(qty_change));
    await client.query('UPDATE raw_materials SET stock_qty=$1,updated_at=NOW() WHERE id=$2', [new_qty, req.params.id]);
    await client.query('COMMIT');
    res.json({ success: true, new_qty, name: mat.name });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// Product ingredients (recipe)
app.get('/api/products/:id/ingredients', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT pi.id, pi.product_id, pi.raw_material_id,
              rm.name AS material_name, rm.category AS material_category,
              rm.unit, rm.unit_cost, rm.stock_qty,
              pi.qty_per_unit,
              ROUND((pi.qty_per_unit * rm.unit_cost)::numeric, 0) AS cost_contribution
       FROM product_ingredients pi
       JOIN raw_materials rm ON rm.id = pi.raw_material_id
       WHERE pi.product_id = $1
       ORDER BY rm.category, rm.name`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products/:id/ingredients', async (req, res) => {
  const { raw_material_id, qty_per_unit } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO product_ingredients (product_id, raw_material_id, qty_per_unit)
       VALUES ($1,$2,$3)
       ON CONFLICT (product_id, raw_material_id) DO UPDATE SET qty_per_unit=$3
       RETURNING *`,
      [req.params.id, raw_material_id, qty_per_unit]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id/ingredients/:rid', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM product_ingredients WHERE product_id=$1 AND raw_material_id=$2',
      [req.params.id, req.params.rid]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/ingredients-overview', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT rm.*,
        COUNT(DISTINCT pi.product_id)::integer AS used_in_products,
        COALESCE(ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), ARRAY[]::text[]) AS product_names
      FROM raw_materials rm
      LEFT JOIN product_ingredients pi ON pi.raw_material_id = rm.id
      LEFT JOIN products p ON p.id = pi.product_id AND p.active = TRUE
      GROUP BY rm.id ORDER BY rm.category, rm.name
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// TRANSACTION DETAIL
// ============================================================
app.get('/api/transactions/:id/detail', async (req, res) => {
  try {
    const txn = await pool.query(`
      SELECT t.*,
        COALESCE(JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', ti.id, 'product_id', ti.product_id,
            'name', ti.product_name, 'category', ti.category,
            'qty', ti.quantity, 'unit_price', ti.unit_price,
            'unit_cost', ti.unit_cost, 'line_total', ti.line_total,
            'margin', ROUND(((ti.unit_price - ti.unit_cost) / NULLIF(ti.unit_price,0) * 100)::numeric, 1)
          ) ORDER BY ti.id
        ) FILTER (WHERE ti.id IS NOT NULL), '[]'::json) AS items
      FROM transactions t
      LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
      WHERE t.id = $1
      GROUP BY t.id
    `, [req.params.id]);

    if (!txn.rows.length) return res.status(404).json({ error: 'Not found' });

    const journals = await pool.query(`
      SELECT j.entry_date, j.description, j.account_code,
             c.name AS account_name, j.debit, j.credit
      FROM journal_entries j
      LEFT JOIN chart_of_accounts c ON c.code = j.account_code
      WHERE j.reference_no = $1
      ORDER BY j.id
    `, [txn.rows[0].receipt_no]);

    const row = txn.rows[0];
    res.json({
      ...row,
      date: row.transaction_date instanceof Date
        ? row.transaction_date.toISOString().split('T')[0]
        : String(row.transaction_date||'').split('T')[0],
      time: typeof row.transaction_time === 'string'
        ? row.transaction_time.slice(0,5)
        : String(row.transaction_time||'').slice(0,5),
      payment: row.payment_method,
      receiptNo: row.receipt_no,
      items: row.items || [],
      journalEntries: journals.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── SERVE REACT BUILD (production) ─────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));
}

app.listen(PORT, () => {
  console.log(`Khasanah Sari Bakery AIS Server running on port ${PORT}`);
  console.log(`WIB date: ${wibDateStr()} | WIB time: ${wibTimeStr()}`);
});
