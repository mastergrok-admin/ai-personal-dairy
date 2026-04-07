# FinDiary — Indian Family Financial Tracker: Feature Roadmap

> A comprehensive feature plan for an Indian household covering salaried employees, business owners, taxpayers, investors, landowners, and informal lenders.

---

## What's Already Built

| Feature | Status |
|---------|--------|
| Bank Accounts (savings, current) + Fixed Deposits | ✅ Done |
| Credit Cards (due dates, billing cycle, limits) | ✅ Done |
| Loans (home, car, personal, education, gold) | ✅ Done |
| Family member profiles | ✅ Done |
| Reminders (credit card due, EMI, custom) | ✅ Done |
| Overview dashboard | ✅ Done |
| Role-based access control, invite system | ✅ Done |

---

## Must-Have Features

These directly address daily financial reality for an Indian family and create the core value of the app.

---

### 1. Income Tracker

Track all income sources across the family — not just salary but every rupee coming in.

**Fields per entry:** source type, amount, month/year, notes, family member

| Income Type | Details |
|-------------|---------|
| Salary | Monthly take-home, gross, employer name |
| Business / Self-employment | Monthly net profit or turnover |
| Rental income | Per property, monthly |
| Freelance / Consulting | Per project or monthly |
| Agricultural income | Annual, exempt from tax |
| Pension | Monthly |
| Other | Gifts received, prize money, etc. |

**Why it matters:** Without income, you can't compute savings rate, tax liability, or budget headroom. Also needed for ITR filing reminders.

---

### 2. Expense Tracker

Daily/monthly expense logging with Indian-relevant categories.

**Categories (India-specific):**
- Groceries & Kirana
- Vegetables & Fruits (sabzi)
- Fuel (petrol/diesel/CNG)
- Auto / Cab / Bus / Metro
- School fees & tuition
- Medical & medicines
- Electricity / Water / Gas (cylinder)
- Internet & Mobile recharge
- Temple / Donations / Religious
- Eating out / Zomato / Swiggy
- Clothing
- Household repairs & maintenance
- EMIs (auto-linked from Loans module)
- Rent paid

**Views:** monthly summary, category breakdown, family-member-wise, trend over months

---

### 3. Investments Portfolio

The most requested feature for any Indian earning family. Covers all asset classes Indians invest in.

#### 3a. Mutual Funds
- Fund name, AMC, scheme type (equity/debt/hybrid/ELSS)
- SIP amount, SIP date, start date
- Total invested, current NAV, current value, P&L
- ELSS funds flagged separately (80C eligible)
- Folio number (last 4 digits)

#### 3b. Stocks (Equity)
- Company, exchange (NSE/BSE), purchase price, quantity
- Current price (manual update or future API)
- Realized + unrealized P&L
- Dividend received
- Demat account reference (broker name)

#### 3c. PPF (Public Provident Fund)
- Account number (last 4), bank/post office
- Opening date, maturity date (15 years)
- Annual contributions, current balance
- 80C eligibility auto-flagged

#### 3d. EPF (Employee Provident Fund)
- UAN (last 4 digits)
- Monthly employee + employer contribution
- Current balance (manual)
- Linked to salary/employer

#### 3e. NPS (National Pension System)
- PRAN (last 4 digits), tier (I/II)
- Monthly contribution, current corpus
- 80CCD eligible

#### 3f. Sovereign Gold Bonds (SGB)
- Series name, units, issue price, current price
- Maturity date, interest rate (2.5% p.a.)

#### 3g. NSC / KVP / Post Office Schemes
- Scheme name, amount, purchase date, maturity date, interest rate

#### 3h. Chit Fund
- Organizer, monthly contribution, prize value, month won (if won), end date

---

### 4. Tax Planner (80C / ITR)

The single biggest pain point for Indian earners — managing deductions and knowing tax liability.

#### 80C Investment Tracker (₹1.5L limit)
Shows running total of 80C-eligible investments per financial year:
- EPF contribution
- PPF contribution
- ELSS mutual funds
- Life insurance premium
- NSC
- Children's tuition fees
- Home loan principal repayment
- NPS Tier I (additional ₹50,000 under 80CCD)

Displays: invested so far · remaining room under ₹1.5L · recommended actions

#### Other Deductions
| Section | Deduction | Max |
|---------|-----------|-----|
| 80D | Health insurance premium | ₹25,000 / ₹50,000 (senior) |
| 80E | Education loan interest | No limit |
| 80G | Donations | 50%/100% of amount |
| 24(b) | Home loan interest | ₹2,00,000 |
| HRA | House Rent Allowance | Calculated |

#### Tax Regime Selector
Old vs New regime comparison with estimated tax liability based on income and deductions entered.

#### Advance Tax Reminders
Deadlines: 15 Jun (15%), 15 Sep (45%), 15 Dec (75%), 15 Mar (100%) — auto-reminders when income exceeds ₹10,000 tax/year.

#### Form 15G / 15H Tracker
For FDs: flag accounts where TDS could be avoided by filing 15G/15H; reminder before FY start.

---

### 5. Properties & Real Estate

Tracks land, house, plot, commercial property.

**Fields:** property type, address/location, area (sq ft / cents / acres), purchase date, purchase price, current estimated value, co-owner (family member), loan linked, rental income, annual property tax

**Property types:** Residential flat, Independent house, Plot / Land, Agricultural land, Commercial property

**Documents reference:** sale deed date, registration number (not storing the file, just reference)

---

### 6. Personal Lending & Borrowing

Very common in India — lending money to friends/relatives and keeping track.

**Lend money (Given):**
- Person name, amount, date given, purpose
- Expected repayment date
- Repayments received (partial/full)
- Outstanding balance
- Notes (verbal/written agreement)

**Borrow money (Received):**
- Same fields from borrower perspective

**Features:**
- Overdue alert when repayment date passes
- WhatsApp-friendly reminder text generation
- Linked to family members if applicable

---

### 7. Gold Tracker (Physical Gold)

Indians hold significant wealth in physical gold. This tracks it without needing jewellery-level detail.

**Fields:** description (earrings, chain, bangle, coin, bar), weight (grams), purity (22K/24K/18K), purchase date, purchase price per gram, current price per gram (manual), stored at (home / bank locker / relative's), family member owner

**Computed:** current market value, unrealized gain/loss since purchase

---

### 8. Insurance Manager

Insurance policies expire, premiums get missed, and claims go untraceable. This fixes that.

**Policy types:**
- Term / Life Insurance (LIC, HDFC Life, etc.)
- Health Insurance (individual + family floater)
- Vehicle Insurance (car, two-wheeler)
- Property / Home Insurance
- PMJJBY / PMSBY (government schemes)

**Fields per policy:** insurer, policy number (last 6), sum assured, premium amount, premium frequency (monthly/quarterly/annual), renewal date, nominee, family member covered

**Alerts:** 30-day and 7-day renewal reminders

---

### 9. Budget Planner

Monthly budget vs actual spending comparison.

- Set budget per category per month
- Auto-pull actuals from Expense Tracker
- Traffic-light status: green (under budget), amber (80%+), red (exceeded)
- Monthly savings rate = (income − expenses) / income
- Annual plan view

---

### 10. Net Worth Dashboard

Single-screen view of the family's complete financial picture.

```
ASSETS                          LIABILITIES
──────────────────────────────────────────────
Bank + FD       ₹ X,XX,XXX     Home Loan       ₹ X,XX,XXX
Mutual Funds    ₹ X,XX,XXX     Car Loan        ₹ X,XX,XXX
Stocks          ₹ X,XX,XXX     Personal Loans  ₹ X,XX,XXX
PPF + EPF       ₹ X,XX,XXX     Credit Cards    ₹ X,XX,XXX
Properties      ₹ X,XX,XXX     Friends/Borrowed ₹ X,XX,XXX
Gold            ₹ X,XX,XXX
Lent to others  ₹ X,XX,XXX
──────────────────────────────────────────────
TOTAL ASSETS    ₹ XX,XX,XXX    TOTAL LIAB.     ₹ XX,XX,XXX
                                NET WORTH       ₹ XX,XX,XXX
```

Trend chart: net worth month-over-month for the last 12 months.

---

## Good-to-Have Features

Important but not blocking core value. Build after must-haves are stable.

---

### 11. Vehicle Tracker

- Vehicle type, make/model, year, registration number (last 4), fuel type
- Purchase price, current estimated resale value
- Linked loan (from Loans module)
- Insurance linked (from Insurance module)
- PUC expiry reminder, RC renewal reminder
- Service history log (date, km, service centre, cost)

---

### 12. Financial Goals

Goal-based savings planner.

**Examples:** Buy a house, Child's education, Daughter's wedding, Retirement corpus, Emergency fund, Foreign vacation

**Fields:** goal name, target amount, target date, linked savings account/investment, monthly SIP needed (auto-calculated)

Progress bar and monthly contribution required to stay on track.

---

### 13. Dividend & Interest Income Tracker

- Dividends from stocks and mutual funds
- Interest income from FDs, savings accounts, NSC
- Auto-populate from FD module (interest = maturity − principal)
- Annual totals for ITR filing (income from other sources)

---

### 14. Business / GST Tracker (for business owners)

- GST number, business name, registration date
- Monthly turnover (GSTR-1 reference)
- Input tax credit (ITC) tracking
- GST filing due date reminders (20th of every month for GSTR-3B)
- Quarterly GST reminders for composition scheme

---

### 15. SIP Calendar

Visual monthly calendar showing all upcoming SIP debits and loan EMI dates. Helps avoid missed payments on low-balance days.

---

### 16. Document Vault (Reference Only)

Not storing actual documents — just metadata so you know what you have and where to find it.

**Record:** document name, type (PAN, Aadhaar, Passport, Sale Deed, RC, Policy, Degree), linked entity (person/property/vehicle), physical location or digital location hint, expiry date (for passport, driving licence)

**Alerts:** expiry reminders (30 days before)

---

### 17. Subscription & Bill Tracker

Recurring monthly/annual payments that drain accounts silently.

- OTT (Netflix, Prime, Hotstar, SonyLIV)
- Internet (Jio Fiber, Airtel, etc.)
- Mobile recharge (plan renewal date)
- Electricity, gas, water (due dates + auto bill amounts)
- Gym, club memberships
- Cloud storage, software subscriptions

**Alert:** 3-day reminder before due date

---

### 18. Emergency Fund Tracker

Target: 6 months of expenses. Shows how much is set aside vs target, which accounts it's in, and months of runway available.

---

### 19. Salary Slip Analyzer

Manual entry of key components from monthly salary slip:

- Gross salary, basic, HRA, special allowance
- PF deduction, professional tax, TDS (monthly)
- Net take-home

Auto-populates HRA deduction calculation, EPF contribution tracking, tax projection.

---

### 20. Financial Calendar

A single monthly view aggregating:
- All EMI due dates
- All SIP debits
- Credit card billing cycle and due dates
- Insurance renewal dates
- Tax deadlines
- FD maturity dates
- Subscription renewals
- Loan/personal lending repayment expected dates

---

## Feature Priority Matrix

| Priority | Feature | Complexity | Impact |
|----------|---------|------------|--------|
| 🔴 P0 | Income Tracker | Low | Very High |
| 🔴 P0 | Expense Tracker | Medium | Very High |
| 🔴 P0 | Net Worth Dashboard | Low | Very High |
| 🔴 P0 | Investments (MF, PPF, EPF) | Medium | Very High |
| 🔴 P0 | Personal Lending/Borrowing | Low | High |
| 🟠 P1 | Tax Planner (80C) | Medium | Very High |
| 🟠 P1 | Properties & Real Estate | Low | High |
| 🟠 P1 | Gold Tracker | Low | High |
| 🟠 P1 | Insurance Manager | Low | High |
| 🟠 P1 | Budget Planner | Medium | High |
| 🟡 P2 | Stocks Portfolio | High | High |
| 🟡 P2 | Vehicle Tracker | Low | Medium |
| 🟡 P2 | Financial Goals | Medium | High |
| 🟡 P2 | SIP Calendar | Low | Medium |
| 🟡 P2 | Subscription & Bill Tracker | Low | Medium |
| 🟢 P3 | Dividend & Interest Income | Medium | Medium |
| 🟢 P3 | Business / GST Tracker | High | Medium |
| 🟢 P3 | Document Vault | Low | Medium |
| 🟢 P3 | Financial Calendar | Medium | High |
| 🟢 P3 | Salary Slip Analyzer | Medium | Medium |
| 🟢 P3 | Emergency Fund Tracker | Low | Medium |

---

## Suggested Build Order

### Phase 1 — Complete the financial picture
1. Income Tracker
2. Expense Tracker
3. Net Worth Dashboard (pulls from all existing + new modules)
4. Personal Lending & Borrowing

### Phase 2 — Investments
5. Mutual Funds (SIP + lumpsum)
6. PPF / EPF / NPS
7. Gold Tracker (physical + SGB)
8. Properties & Real Estate

### Phase 3 — Tax & insurance
9. Tax Planner (80C tracker + regime comparison)
10. Insurance Manager
11. Dividend & Interest Income (for ITR)

### Phase 4 — Planning tools
12. Budget Planner
13. Financial Goals
14. Financial Calendar / SIP Calendar

### Phase 5 — Business & advanced
15. Stocks Portfolio
16. Business / GST Tracker
17. Salary Slip Analyzer
18. Document Vault
19. Subscription & Bill Tracker

---

## India-Specific Considerations

- All amounts in **INR (₹)**, stored as paise (BigInt) — already implemented
- Financial year: **April to March** (not calendar year) — affects all tax and budget features
- Tax slabs change annually in the Union Budget — deduction limits should be configurable in Admin Settings
- **Nominee tracking** is legally important in India — every investment/insurance should have a nominee field
- **HUF (Hindu Undivided Family)** as an entity type for advanced users
- Amounts in **Indian number system** (lakhs, crores) — formatINR already handles this
- **UPI reference** for expense tracking (future: import from bank statement)
