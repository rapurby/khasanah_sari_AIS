// ============================================================
// Holland Bakery AIS — API Service Layer v2.1
// ============================================================
const BASE = '/api';

const handle = async (res) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
};

// ─── AUTH ───────────────────────────────────────────────────
export const login = (role, pin) =>
  fetch(`${BASE}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({role,pin}) }).then(handle);

// ─── PRODUCTS ───────────────────────────────────────────────
export const getProducts = () => fetch(`${BASE}/products`).then(handle);
export const createProduct = (data) =>
  fetch(`${BASE}/products`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(handle);
export const updateProduct = (id, data) =>
  fetch(`${BASE}/products/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(handle);
export const deleteProduct = (id) =>
  fetch(`${BASE}/products/${id}`, { method:'DELETE' }).then(handle);
export const adjustStock = (id, qty_change, reason, performed_by, movement_type) =>
  fetch(`${BASE}/products/${id}/adjust-stock`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({qty_change,reason,performed_by,movement_type}) }).then(handle);

// ─── TRANSACTIONS ───────────────────────────────────────────
export const getTransactions = (date, limit=500, month, year) => {
  const params = new URLSearchParams({ limit });
  if (date)  params.append('date', date);
  if (month) params.append('month', month);
  if (year)  params.append('year', year);
  return fetch(`${BASE}/transactions?${params}`).then(handle);
};
export const createTransaction = (data) =>
  fetch(`${BASE}/transactions`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(handle);

// ─── INVENTORY LOGS ─────────────────────────────────────────
export const getInventoryLogs = () => fetch(`${BASE}/inventory-logs`).then(handle);

// ─── ACCOUNTING ─────────────────────────────────────────────
export const getJournalEntries = (month, year, limit=500) => {
  const params = new URLSearchParams({ limit });
  if (month) params.append('month', month);
  if (year)  params.append('year', year);
  return fetch(`${BASE}/journal-entries?${params}`).then(handle);
};
export const getGeneralLedger = (month, year) => {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  if (year)  params.append('year', year);
  return fetch(`${BASE}/general-ledger?${params}`).then(handle);
};
export const getChartOfAccounts = () => fetch(`${BASE}/chart-of-accounts`).then(handle);

// ─── REPORTS ────────────────────────────────────────────────
export const getReportSummary = (month, year) => {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  if (year)  params.append('year', year);
  return fetch(`${BASE}/reports/summary?${params}`).then(handle);
};
export const getCashReceipt = (date) => {
  const params = date ? `?date=${date}` : '';
  return fetch(`${BASE}/reports/cash-receipt${params}`).then(handle);
};
export const verifyDeposit = (date, verified_by) =>
  fetch(`${BASE}/reports/cash-receipt/verify`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({date,verified_by}) }).then(handle);

// ─── PERIODS ────────────────────────────────────────────────
export const getAvailablePeriods = () => fetch(`${BASE}/periods`).then(handle);

// ─── RAW MATERIALS ──────────────────────────────────────────
export const getRawMaterials    = ()       => fetch('/api/raw-materials').then(handle);
export const createRawMaterial  = (data)   => fetch('/api/raw-materials', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(handle);
export const updateRawMaterial  = (id,data)=> fetch(`/api/raw-materials/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(handle);
export const adjustRawMaterial  = (id,qty_change,reason,performed_by) =>
  fetch(`/api/raw-materials/${id}/adjust`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({qty_change,reason,performed_by}) }).then(handle);

// ─── PRODUCT INGREDIENTS ────────────────────────────────────
export const getProductIngredients  = (productId)         => fetch(`/api/products/${productId}/ingredients`).then(handle);
export const addProductIngredient   = (productId,data)    => fetch(`/api/products/${productId}/ingredients`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(handle);
export const deleteProductIngredient= (productId,matId)   => fetch(`/api/products/${productId}/ingredients/${matId}`, { method:'DELETE' }).then(handle);
export const getIngredientsOverview = ()                   => fetch('/api/ingredients-overview').then(handle);

// ─── TRANSACTION DETAIL ─────────────────────────────────────
export const getTransactionDetail = (id) => fetch(`/api/transactions/${id}/detail`).then(handle);
