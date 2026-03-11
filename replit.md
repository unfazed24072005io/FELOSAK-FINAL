# Feloosak: Your Cash Book for Business & Personal Finance Management

A fully functional cash book application built for Egyptian SMEs (Small & Medium Enterprises). Designed for the Misr (Egypt) market with Arabic pound (EGP) formatting throughout. Supports multiple cash books per user, team collaboration, and optional cloud sync. Features include SMS transaction parsing, invoice generation with business profiles, payment reminders (Email/WhatsApp/SMS), multi-language support, and digital storefront.

## Architecture

### Multi-Book Design
- Users can create multiple cash books (local or cloud-synced)
- **Local books**: stored on-device via AsyncStorage, work offline
- **Cloud books**: synced to PostgreSQL via Express API, shareable with team members
- Existing data is auto-migrated into a default "My Cash Book" on first launch

### Backend
- Express.js with session-based auth (express-session + connect-pg-simple)
- PostgreSQL database via Drizzle ORM
- Password hashing with crypto.scryptSync (no native module dependency)
- Full REST API for books, transactions, debts, products, members, business profiles, and invoices
- Role-based access: owner, editor, viewer per book
- Public storefront API for sharing product catalogs
- Also serves landing page, storefront page, and static app bundle

### Data Storage Keys (AsyncStorage - Local Books)
- `misr_books` — array of local book metadata
- `misr_tx_{bookId}` — transactions for a specific local book
- `misr_debts_{bookId}` — debts for a specific local book
- `misr_products_{bookId}` — products for a specific local book
- `misr_pin` — PIN lock code
- `misr_language` — selected language (en/ar)
- Legacy keys `misr_transactions` and `misr_debts` are auto-migrated to default book

### Database Tables (Cloud Books)
- `users` — registered user accounts
- `books` — cloud cash books
- `book_members` — membership with roles (owner/editor/viewer)
- `cloud_transactions` — transactions in cloud books
- `cloud_debts` — debts in cloud books (with phone field for reminders)
- `products` — products in cloud books (for digital storefront)
- `business_profiles` — business profile per book (name, logo, address, phone, email, tax ID, bank details, terms)
- `invoices` — invoices per book (invoice number, client info, line items, tax/discount, totals, status)
- `session` — express-session store (auto-created)

### Input Validation
- Amount parsing: handles commas (1,500), Arabic numerals (١٢٣), Arabic decimal separator (٫)
- Date validation: enforces YYYY-MM-DD format
- All interactive elements have accessibility labels

## Tech Stack
- **Frontend**: Expo React Native (Expo Router, file-based routing)
- **Backend**: Express.js (TypeScript) with session auth
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: AsyncStorage (local books) + PostgreSQL (cloud books)
- **UI**: React Native StyleSheet, @expo/vector-icons, expo-haptics
- **i18n**: Custom LanguageContext with Arabic + English translations
- **PDF**: expo-print + expo-sharing for invoice/report generation

## App Features

### Multi-Book System
- Create multiple cash books (local or cloud)
- Local books work entirely offline on device
- Cloud books sync to server, shareable with team members
- Books list overview with badge indicators (Local/Cloud)
- Auto-migration of legacy data to default book

### Team Collaboration (Cloud Books)
- Add team members by username
- Role-based access: owner (full control), editor (add/edit data), viewer (read-only)
- Member management screen with role changes and removal

### Auth System
- Register/login with username + password
- Session-based authentication
- Account screen with sign-out

### Core Cash Book (per book)
- Add income and expense transactions with categories
- EGP (ج.م) formatting with proper thousands separators
- Date tracking for every entry
- Payment mode selection: Cash, InstaPay, Vodafone Cash, Fawry, Bank Transfer, International Transfer, Cheque, Other
- Attachment support: Take photo or upload image (bills, invoices, receipts) as proof of payment
- Payment mode badges displayed on dashboard entries and transaction list
- Attachment indicator (paperclip icon) on entries with attached proof

### SMS Reader (NEW)
- Paste or enter bank/payment SMS messages
- Automatic parsing for transaction amounts, sender, dates
- Shows parsed results with one-tap option to add as cash in or cash out
- Accessible from dashboard quick-actions row

### Invoice Generation (NEW - Cloud Books)
- Create professional invoices with client info, line items, tax, discount
- Auto-generated invoice numbers
- HTML-to-PDF invoice generation with business branding
- Invoice status tracking: Draft → Sent → Paid (with Overdue)
- Share/print invoices via expo-sharing
- Full invoices list with status management

### Business Profile (NEW - Cloud Books)
- Customizable business profile per book
- Fields: business name, address, city, country, phone, email, website
- Tax/registration numbers for compliance
- Bank details (name, account, IBAN) for payment info on invoices
- Terms & conditions and footer notes
- Profile data auto-populates invoice headers

### Payment Reminders (Enhanced)
- WhatsApp deep link with pre-filled reminder message
- SMS reminder with pre-filled message
- Email reminder via mailto: link with subject and body
- Pre-filled messages include debtor name and amount
- Available on all outstanding debts (email always visible, WhatsApp/SMS when phone available)

### Dashboard (Professional Expense Manager Style)
- Header with back arrow, book title, subtitle (role/type), add member icon, PDF report icon, three-dot menu
- Filter bar: Entry Type (All/Cash In/Cash Out), Payment Mode filter, Clear button
- Balance summary card: Net Balance, Total In (+), Total Out (-), VIEW REPORTS link (totals update with filters)
- Quick actions row: SMS Reader, Invoices, Business Profile (cloud books only)
- "Showing X entries" counter (reflects filtered count)
- Date-grouped entry list with category badges, EGP amounts, running balance per entry
- "Entry by You" attribution with timestamps
- Sticky bottom bar: CASH IN (green) and CASH OUT (red) action buttons
- Three-dot menu: Book Settings, Team Members (cloud), View Reports, Generate Report, Delete All Entries

### Generate Report Screen
- Filter summary (Duration, Entry Type, Payment Mode)
- Entry Type filter chips (All/Cash In/Cash Out)
- Payment Mode filter chips (scrollable)
- Report type selection: All Entries Report, Day-wise Summary, Category-wise Summary
- Stats preview (matched entries count, totals)
- GENERATE EXCEL button (CSV download/share with UTF-8 BOM)
- GENERATE PDF button (HTML-to-PDF with professional styling, XSS-safe)

### Transactions Screen
- Full transaction list with filter by All / Income / Expense
- Tap to edit, long-press to delete (with confirmation)
- Requires active book selection

### AR/AP Tracker (Debtors Screen)
- Track who owes you (Accounts Receivable)
- Track who you owe (Accounts Payable)
- Due dates with overdue warnings
- One-tap settle functionality
- Phone number field for contacts
- Payment reminder buttons (WhatsApp + SMS + Email) for outstanding debts
- Pre-filled reminder messages with amount and customer name

### Digital Storefront (Store Tab)
- Product catalog management per book
- Add products with name, description, price (EGP), category, image
- In-stock toggle for availability
- 2-column product grid with image preview
- Share Store button generates public storefront URL
- Public storefront page (server-rendered HTML at /store/:bookId)
- Products support local (AsyncStorage) and cloud (API) storage

### Analytics Screen
- 6-month income vs expense bar chart
- Top income/expense category breakdowns
- Savings rate calculator
- Stat cards for balances

### Multi-Language Support
- Arabic (العربية) and English language options
- Language switcher in Settings
- Translation context (LanguageContext) with t() function
- Language preference persisted to AsyncStorage
- RTL layout support for Arabic

### Book Settings Screen
- Rename book with inline text input
- General Book Settings: Entry Field Settings, Edit Data Operator Role, Book Activity
- Members list with role badges (Primary Admin, Admin, Employee)
- Roles & Permissions modal (tabbed: Primary Admin/Admin/Employee with permission details)
- Delete book with type-to-confirm flow (owner-only)

### Sort Books
- Sort modal in books list header with 5 options: Last Updated, Name A-Z, Balance High/Low, Last Created
- APPLY button to confirm sort selection

### Business Team Management
- Role hierarchy visualization (Primary Admin → Admin → Employee)
- Add member via email/username with role assignment
- Members list with role management
- Roles & Permissions detail modal

### Subscription Plans Screen
- Monthly/Yearly billing toggle with savings badge
- Plan tiers: Starter, Essentials (locked), Professional, Business, Enterprise
- Enterprise tier with contact mailto (support@feloosak.com)
- EGP pricing throughout
- Cancel notice with subscription management link

### Settings (Organized Sections)
- Profile card for signed-in users (name, username, edit link)
- Book Settings section (cloud books): Business Team, Business Settings, Subscription
- General Settings: Security (PIN lock), Language (Arabic/English), Your Profile, About
- Sign Out with confirmation
- Lock App Now shortcut when PIN is enabled

## App Structure
```
app/
  _layout.tsx          # Root layout: LanguageProvider > AuthProvider > AppProvider > PinLockOverlay
  (tabs)/
    _layout.tsx        # Tab navigation (Books, Transactions, AR/AP, Store, Analytics)
    index.tsx          # Books list (no book selected) / Dashboard (book selected)
    transactions.tsx   # Transactions list for active book
    debtors.tsx        # AR/AP tracker with reminders (WhatsApp/SMS/Email)
    store.tsx          # Digital storefront / product management
    analytics.tsx      # Charts & analytics for active book
  add-transaction.tsx  # Add/edit transaction (form sheet)
  add-debt.tsx         # Add/edit AR/AP entry with phone field (form sheet)
  add-product.tsx      # Add/edit product (form sheet)
  generate-report.tsx  # Generate Excel/PDF reports (form sheet)
  sms-reader.tsx       # SMS paste & parse → add as transaction (form sheet)
  business-profile.tsx # Business profile CRUD form (form sheet)
  create-invoice.tsx   # Create invoice with line items, tax, PDF generation (form sheet)
  invoices.tsx         # Invoice list with status management (modal)
  settings.tsx         # App settings (PIN, Language)
  auth.tsx             # Login/register screen (modal)
  account.tsx          # Account info + sign out (modal)
  create-book.tsx      # Create new book (form sheet)
  book-members.tsx     # Member management for cloud books (modal)
  book-settings.tsx    # Book settings: rename, roles, delete (modal)
  business-team.tsx    # Business team management with role hierarchy (modal)
  subscription.tsx     # Subscription plans with billing toggle (modal)
context/
  AuthContext.tsx       # Auth state (login, register, logout, current user)
  AppContext.tsx        # Multi-book state, active book, transactions, debts, products, PIN
  LanguageContext.tsx   # i18n state (language, t() function, isRTL)
i18n/
  translations.ts      # English and Arabic translation strings (600+ keys)
utils/
  format.ts            # EGP formatting, date validation, Arabic numeral normalization
components/
  PinLockOverlay.tsx   # PIN lock fullscreen overlay
  ErrorBoundary.tsx    # Error boundary
  ErrorFallback.tsx    # Error fallback UI
constants/
  colors.ts            # Dark (navy #0B1426 + blue #3B82F6 accent) and light theme
server/
  index.ts             # Express server entry
  routes.ts            # API routes (auth, books, transactions, debts, products, members, storefront, business profiles, invoices)
  storage.ts           # Database CRUD operations
  db.ts                # Drizzle ORM + pg pool connection
  templates/
    landing-page.html  # Static landing page
    storefront.html    # Public storefront page
shared/
  schema.ts            # Drizzle schema (users, books, book_members, cloud_transactions, cloud_debts, products, business_profiles, invoices)
```

## API Routes
- POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/me
- GET/POST /api/books, GET/PUT/DELETE /api/books/:id
- GET/POST/PUT/DELETE /api/books/:id/transactions[/:txId]
- GET/POST/PUT/DELETE /api/books/:id/debts[/:debtId]
- GET/POST/PUT/DELETE /api/books/:id/products[/:productId]
- GET/POST /api/books/:id/members, PUT/DELETE /api/books/:id/members/:memberId
- GET/PUT /api/books/:id/business-profile
- GET/POST /api/books/:id/invoices, PUT/DELETE /api/books/:id/invoices/:invoiceId
- GET /api/store/:bookId (public — no auth, returns products for storefront)
- GET /store/:bookId (public — serves storefront HTML page)

## Design
- **Dark theme**: Navy (#0B1426) with blue (#3B82F6) accent, green income (#10B981), red expense (#EF4444)
- **Light theme**: Clean white (#FFFFFF) with matching accent colors
- Font: Inter (400, 500, 600, 700)
- Egyptian market context: EGP currency symbol ج.م throughout
- NO emojis — use @expo/vector-icons Feather icons only

## Deployment
- Build: `npm install && npx expo export --platform web --output-dir dist && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=server_dist`
- Run: `NODE_ENV=production node server_dist/index.js`
- Server serves both static web build (dist/) and API routes
- SPA fallback serves dist/index.html for non-API GET requests
- Session cookies secured in production (secure: true, trust proxy)

## Workflows
- `Start Backend`: `npm run server:dev` — Express on port 5000
- `Start Frontend`: `npm run expo:dev` — Expo Metro on port 8081

## Bug Fix History
- All `req.params` wrapped via `param()` helper for Express 5 compatibility
- Session table pruning enabled (pruneSessionInterval: 15min)
- Storefront template path uses `process.cwd()` instead of `__dirname` (correct in esbuild bundle)
- All screens fully internationalized (550+ translation keys in en/ar)
- All destructive actions use themed Modal instead of Alert.alert
- File sharing checks `Sharing.isAvailableAsync()` before sharing
- Filenames sanitized for both web and native exports
- Auth screen uses dedicated `signInTitle` key (not settings subtitle)
