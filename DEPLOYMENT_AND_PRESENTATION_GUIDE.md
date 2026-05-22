# 🥐 Holland Bakery AIS — Complete Deployment & Presentation Guide

---

## PART 1 — LOCAL SETUP (Run on Your Laptop)

### Prerequisites
- Node.js 18+ → https://nodejs.org
- PostgreSQL 14+ → https://www.postgresql.org/download/
- Git → https://git-scm.com
- VS Code → https://code.visualstudio.com

---

### Step 1 — Set Up PostgreSQL Locally

**Windows:**
1. Download PostgreSQL installer from postgresql.org
2. Install with default settings, remember your password
3. Open pgAdmin (installed automatically)
4. Right-click "Databases" → Create → Database → name it `holland_bakery`

**Mac:**
```bash
brew install postgresql@14
brew services start postgresql@14
createdb holland_bakery
```

**Linux (Ubuntu):**
```bash
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb holland_bakery
```

---

### Step 2 — Initialize the Database

Open pgAdmin or psql terminal and run the schema file:

**Using psql:**
```bash
psql -U postgres -d holland_bakery -f server/schema.sql
```

**Using pgAdmin:**
1. Open pgAdmin → connect to your server
2. Right-click `holland_bakery` → Query Tool
3. Open `server/schema.sql` → Run (F5)

You should see:
```
Schema and seed data loaded successfully!
total_transactions: ~300
total_products: 12
```

---

### Step 3 — Configure Environment Variables

```bash
# Go to server folder
cd server

# Copy the example file
cp .env.example .env

# Open .env and edit:
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/holland_bakery
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

### Step 4 — Install Dependencies & Run

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd server
npm install
node index.js
# Should print: ✅ PostgreSQL connected
# Should print: 🥐 Holland Bakery AIS Server running on port 4000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm install
npm run dev
# Should print: Local: http://localhost:5173
```

Open browser → http://localhost:5173

**Login credentials:**
| Role       | PIN  |
|------------|------|
| Cashier    | 1234 |
| Supervisor | 2345 |
| Accountant | 3456 |
| Manager    | 4567 |

---

## PART 2 — DEPLOY TO RAILWAY (Public URL for Lecturer)

Railway is the best option: free tier, built-in PostgreSQL, one-click deploy, generates a public HTTPS URL.

---

### Step 1 — Prepare Your Code with Git

```bash
# In the root folder (holland-bakery/)
git init
git add .
git commit -m "Initial commit: Holland Bakery AIS v2.0"
```

**Push to GitHub:**
1. Go to github.com → New Repository → name it `holland-bakery-ais`
2. Make it Public
3. Copy the repository URL (e.g. https://github.com/yourname/holland-bakery-ais.git)

```bash
git remote add origin https://github.com/yourname/holland-bakery-ais.git
git branch -M main
git push -u origin main
```

---

### Step 2 — Create Railway Account

1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign up with GitHub (recommended — easier to connect)

---

### Step 3 — Add PostgreSQL Database

1. On your Railway dashboard → click **"New Project"**
2. Click **"Add a Service"** → select **"Database"** → select **"PostgreSQL"**
3. Railway creates a PostgreSQL instance instantly
4. Click on the PostgreSQL service → go to **"Variables"** tab
5. Copy the `DATABASE_URL` value (you'll need it later)

---

### Step 4 — Initialize the Database on Railway

1. Click on your PostgreSQL service → **"Connect"** tab
2. Use the provided connection string to connect via psql:

```bash
# Railway gives you a command like this:
psql "postgresql://postgres:xxxx@roundhouse.proxy.rlwy.net:12345/railway"

# Once connected, run your schema:
\i server/schema.sql
# OR paste the contents of schema.sql directly
```

**Alternative (easier) — use Railway's Data tab:**
1. Click PostgreSQL service → **"Data"** tab → **"Query"**
2. Paste the entire contents of `server/schema.sql`
3. Click Run

---

### Step 5 — Deploy the Application

1. Railway dashboard → **"New Project"** → **"Deploy from GitHub Repo"**
2. Select your `holland-bakery-ais` repository
3. Railway detects it automatically

**Set Environment Variables:**
Click your service → **"Variables"** tab → add these:

| Variable       | Value                                                |
|----------------|------------------------------------------------------|
| `DATABASE_URL` | (paste from Step 3 — the PostgreSQL URL)             |
| `NODE_ENV`     | `production`                                         |
| `PORT`         | `4000`                                               |
| `FRONTEND_URL` | `https://your-app-name.up.railway.app` (your domain) |

**Set Build & Start Commands:**
Click your service → **"Settings"** tab:
- Build Command: `cd client && npm install && npm run build && cd ../server && npm install`
- Start Command: `node server/index.js`

---

### Step 6 — Generate Public Domain

1. Click your service → **"Settings"** tab
2. Scroll to **"Networking"** → click **"Generate Domain"**
3. Railway creates: `https://your-app-name.up.railway.app`

**That URL is your public URL — share it with your lecturer!**

---

### Step 7 — Verify Deployment

1. Open your Railway URL in browser
2. Login with any PIN
3. Make a test sale in POS
4. Check that data appears in Accounting → Sales Journal
5. Refresh the page — data should persist (it's in PostgreSQL!)

---

### Troubleshooting

**"Cannot connect to database"**
→ Check `DATABASE_URL` in Railway variables — must match exactly

**"Build failed"**
→ Check Railway build logs, usually a missing `package.json` or wrong folder structure

**"Application error" on homepage**
→ Check Railway deploy logs — look for the error message

**Data not saving after refresh**
→ Make sure you're using the Railway DATABASE_URL, not localhost

---

## PART 3 — FULL PRESENTATION GUIDE

### Time Budget: 15 minutes total

---

### SLIDE 1 — Title Slide (30 seconds)
**What to say:**
> "Good morning/afternoon, today I will present our final project: the Holland Bakery Accounting Information System. This is a fully functional web-based ERP system for a real-world bakery, covering the complete revenue cycle from point-of-sale all the way to financial statement generation."

**Show:** Login page on screen

---

### SLIDE 2 — Business Context (1 minute)
**What to say:**
> "Holland Bakery is one of Indonesia's largest retail bakery chains with over 60 outlets. The business processes approximately 200+ transactions per day per outlet. Without an integrated AIS, management faces reconciliation errors, inventory shrinkage from poor tracking, delayed financial reporting, and no real-time visibility into profitability."

> "Our system solves all of this by integrating the sales cycle, cash receipt cycle, inventory management, and accounting into one platform backed by a real PostgreSQL database."

**Key academic reference:** Romney & Steinbart — Revenue Cycle in Accounting Information Systems

---

### SLIDE 3 — System Architecture (2 minutes)
**What to say:**
> "The system is built as a full-stack web application. The frontend is React.js, which provides a real-time interactive interface. The backend is Node.js with Express, which handles all business logic and accounting automation. The database is PostgreSQL, which stores all operational and financial data persistently."

> "The system is organized into 7 modules: POS Sales, Cash Receipt, Inventory Management, Sales Journal, General Ledger, Financial Reports, and Chart of Accounts."

**Draw attention to:** Department swimlane structure from your flowchart
- Customer → Cashier → Kitchen/Inventory → Supervisor → Finance → Bank → Accounting → Management

> "Each department has clear responsibilities and separation of duties — which is a core internal control requirement in AIS design."

---

### SLIDE 4 — Live Demo: POS Module (3 minutes)
**Log in as Cashier (PIN: 1234)**

**Walk through:**
1. "Here is the POS dashboard. The cashier can search or filter products by category."
2. Click a few products → "When I add a product to the cart, the stock automatically decrements — this is real-time inventory tracking."
3. Show cart subtotal, VAT 11%, total calculation
4. "VAT is automatically calculated at 11% — compliant with Indonesian tax regulation."
5. Click Process Payment → select QRIS
6. Show receipt modal
7. "The receipt is generated instantly with a unique receipt number, timestamp, and itemized list."

**Key point to emphasize:**
> "What makes this academically significant is what happens in the background. When I completed that transaction, the system simultaneously: recorded the sale in the Sales Journal, debited QRIS Receivable, credited Revenue by category, credited VAT Payable, debited COGS, and credited Inventory. All automatically. This is the AIS accounting automation that we designed."

---

### SLIDE 5 — Internal Controls (1.5 minutes)
**What to say:**
> "A strong AIS requires robust internal controls. We implemented seven key controls based on the COSO framework."

**Show these on screen or slide:**
1. **Separation of Duties** — Cashier processes sales but cannot approve deposits or access General Ledger
2. **Authorization** — Supervisor must approve bank deposit; shown in the Cash Receipt module
3. **Role-Based Access** — Login system restricts each role to relevant modules only
4. **Verification** — System reconciles POS total vs cash drawer vs bank deposit
5. **Audit Trail** — Every transaction has timestamp, user ID, and receipt number — cannot be deleted, only voided
6. **Reorder Point Control** — Automatic low-stock alerts prevent operational stockouts
7. **Bank Reconciliation** — Three-way match: Cash Journal vs Bank Statement vs GL Cash Account

---

### SLIDE 6 — Live Demo: Accounting Module (2 minutes)
**Log in as Accountant (PIN: 3456)**

**Walk through:**
1. Sales Journal → "Every sale automatically generates double-entry journal entries. No manual posting needed."
2. Cash Receipts Journal → "This shows all cash inflows categorized by payment method."
3. General Ledger → "The GL aggregates all journal entries by account code. Notice accounts 4010–4040 show revenue by product category."
4. Trial Balance → "The trial balance verifies that total debits equal total credits. The green badge confirms our journal is balanced."

**Key point:**
> "This demonstrates the complete accounting cycle: Transaction → Journal → Ledger → Trial Balance → Financial Statements. All in one integrated system."

---

### SLIDE 7 — Live Demo: Financial Reports (2 minutes)
**Still as Accountant**

**Walk through:**
1. Income Statement → "This shows Holland Bakery's complete P&L for the period. Revenue by category, COGS, gross profit, operating expenses, and net income."
2. Point to gross margin and net margin percentages
3. Balance Sheet → "Assets = Liabilities + Equity. Our balance sheet integrates real transaction data from the database."
4. Cash Flow Statement → "Operating, investing, and financing activities — the three-statement model taught in accounting principles."
5. Click Export → "Each report can be exported to CSV/Excel or printed as a PDF with professional formatting — suitable for submission to management."

---

### SLIDE 8 — Inventory & Database (1 minute)
**Log in as Manager (PIN: 4567)**

**Walk through:**
1. Inventory → show low stock alerts
2. Edit a product → change price → save → "This saves directly to PostgreSQL. If I refresh the page, the change persists."
3. Stock adjustment → show audit log

**Key point:**
> "All data is stored in a PostgreSQL relational database with 7 normalized tables. Every product edit, every sale, every stock adjustment is saved permanently."

---

### SLIDE 9 — Competitive Advantages (1 minute)
**What to say:**
> "What distinguishes our project from a basic student prototype?"

List these clearly:
1. **Real database** — PostgreSQL with persistent data, not just browser memory
2. **Full accounting cycle** — Goes all the way from POS transaction to Financial Statements
3. **Auto journal entries** — Every sale generates 5 accounting entries automatically
4. **Indonesian digital payments** — QRIS and GoPay accounts, which most AIS projects ignore
5. **Role-based access control** — 4 roles with different permissions, demonstrating real ERP design
6. **Export functionality** — Reports downloadable as Excel/CSV and printable as PDF
7. **Deployed live** — Accessible by anyone via public URL, not just on one laptop
8. **Inventory integration** — Stock management connected to financial impact (COGS)

---

### SLIDE 10 — Conclusion (30 seconds)
**What to say:**
> "In conclusion, we have built a complete, working Accounting Information System for Holland Bakery. It covers the full revenue cycle, implements AIS internal controls, automates accounting entries, and generates professional financial statements. The system is deployed on a cloud server with a real database, accessible in real-time. This demonstrates not just an understanding of accounting theory, but the practical ability to design and implement a business information system."

> "Thank you. I'm ready for questions."

---

## PART 4 — ANTICIPATED LECTURER QUESTIONS & ANSWERS

**Q: Why did you choose the Revenue Cycle?**
A: The revenue cycle is the most operationally significant cycle for a retail bakery — it generates all cash inflows and directly impacts inventory and financial statements. It also provides the most interesting AIS design challenges: real-time stock deduction, multi-method payment handling, and VAT compliance.

**Q: How does your system ensure data integrity?**
A: We use PostgreSQL transactions (BEGIN/COMMIT/ROLLBACK) for every sale — if any part fails, the entire transaction rolls back. We also have database constraints: foreign keys, enum checks on payment methods and account types, and triggers for updated timestamps.

**Q: Explain the journal entry for a QRIS sale.**
A: When a QRIS payment is made:
- Dr. QRIS Receivable (1030) — total amount
- Cr. Revenue by category (4010/4020/4030/4040) — subtotal
- Cr. VAT Payable (2030) — 11% tax
- Dr. COGS (5010) — cost of goods
- Cr. Inventory (1220) — reduce asset

**Q: What happens if the cashier inputs the wrong amount?**
A: The system does not allow deletion of posted transactions — only voids with a reason code. This is an audit trail control. The supervisor can approve a void, which creates a reversing entry.

**Q: How is this different from just using Excel?**
A: Excel requires manual entry for every journal, has no real-time stock tracking, cannot enforce separation of duties, and is not accessible by multiple users simultaneously. Our system automates journal entries, enforces role-based access, provides real-time data for all users, and is deployed on cloud infrastructure.

**Q: What framework does your system use?**
A: Frontend: React.js (component-based UI). Backend: Node.js with Express (REST API). Database: PostgreSQL (relational DBMS). Deployment: Railway cloud platform. This is a standard modern full-stack architecture.

---

## QUICK REFERENCE — Login PINs

| Role       | Name          | PIN  | Access                                      |
|------------|---------------|------|---------------------------------------------|
| Cashier    | Budi Santoso  | 1234 | Dashboard, POS, Inventory (view only)       |
| Supervisor | Siti Rahayu   | 2345 | + Cash Receipt, Inventory (full edit)       |
| Accountant | Ahmad Fauzi   | 3456 | + Accounting, Financial Reports, COA        |
| Manager    | Dewi Lestari  | 4567 | All modules + full admin                    |

---

*Holland Bakery AIS v2.0 — Accounting Information System Final Project*
*Information Systems Department — Semester 5*
