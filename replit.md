# Misr Cash Book

A fully functional cash book application built for Egyptian SMEs (Small & Medium Enterprises). Designed for the Misr (Egypt) market with Arabic pound (EGP) formatting throughout. Supports multiple cash books per user, team collaboration, and optional cloud sync.

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
- Full REST API for books, transactions, debts, and members
- Role-based access: owner, editor, viewer per book
- Also serves landing page and static app bundle

### Data Storage Keys (AsyncStorage - Local Books)
- `misr_books` — array of local book metadata
- `misr_tx_{bookId}` — transactions for a specific local book
- `misr_debts_{bookId}` — debts for a specific local book
- `misr_pin` — PIN lock code
- Legacy keys `misr_transactions` and `misr_debts` are auto-migrated to default book

### Database Tables (Cloud Books)
- `users` — registered user accounts
- `books` — cloud cash books
- `book_members` — membership with roles (owner/editor/viewer)
- `cloud_transactions` — transactions in cloud books
- `cloud_debts` — debts in cloud books
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

### Dashboard
- Net balance display with income/expense breakdown
- Quick action buttons (Add Income, Add Expense, Add AR/AP)
- Recent transactions list
- Book type indicator (Local/Cloud)
- Back navigation to books list

### Transactions Screen
- Full transaction list with filter by All / Income / Expense
- Tap to edit, long-press to delete (with confirmation)
- Requires active book selection

### AR/AP Tracker (Debtors Screen)
- Track who owes you (Accounts Receivable)
- Track who you owe (Accounts Payable)
- Due dates with overdue warnings
- One-tap settle functionality

### Analytics Screen
- 6-month income vs expense bar chart
- Top income/expense category breakdowns
- Savings rate calculator
- Stat cards for balances

### Security (Settings)
- PIN lock protection (4-digit)
- Lock now / Change PIN / Remove PIN

## App Structure
```
app/
  _layout.tsx          # Root layout: AuthProvider > AppProvider > PinLockOverlay
  (tabs)/
    _layout.tsx        # Tab navigation (Books, Transactions, AR/AP, Analytics)
    index.tsx          # Books list (no book selected) / Dashboard (book selected)
    transactions.tsx   # Transactions list for active book
    debtors.tsx        # AR/AP tracker for active book
    analytics.tsx      # Charts & analytics for active book
  add-transaction.tsx  # Add/edit transaction (form sheet)
  add-debt.tsx         # Add/edit AR/AP entry (form sheet)
  settings.tsx         # App settings (PIN)
  auth.tsx             # Login/register screen (modal)
  account.tsx          # Account info + sign out (modal)
  create-book.tsx      # Create new book (form sheet)
  book-members.tsx     # Member management for cloud books (modal)
context/
  AuthContext.tsx       # Auth state (login, register, logout, current user)
  AppContext.tsx        # Multi-book state, active book, transactions, debts, PIN
utils/
  format.ts            # EGP formatting, date validation, Arabic numeral normalization
components/
  PinLockOverlay.tsx   # PIN lock fullscreen overlay
  ErrorBoundary.tsx    # Error boundary
  ErrorFallback.tsx    # Error fallback UI
constants/
  colors.ts            # Dark (deep green + gold) and light theme
server/
  index.ts             # Express server entry
  routes.ts            # API routes (auth, books, transactions, debts, members)
  storage.ts           # Database CRUD operations
  db.ts                # Drizzle ORM + pg pool connection
shared/
  schema.ts            # Drizzle schema (users, books, book_members, cloud_transactions, cloud_debts)
```

## API Routes
- POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/me
- GET/POST /api/books, GET/PUT/DELETE /api/books/:id
- GET/POST/PUT/DELETE /api/books/:id/transactions[/:txId]
- GET/POST/PUT/DELETE /api/books/:id/debts[/:debtId]
- GET/POST /api/books/:id/members, PUT/DELETE /api/books/:id/members/:memberId

## Design
- **Dark theme**: Deep forest green (#0A1F15) with gold (#C9A84C) accents
- **Light theme**: Warm parchment (#F7F5F0) with dark green accents
- Font: Inter (400, 500, 600, 700)
- Egyptian market context: EGP currency symbol ج.م throughout

## Workflows
- `Start Backend`: `npm run server:dev` — Express on port 5000
- `Start Frontend`: `npm run expo:dev` — Expo Metro on port 8081
