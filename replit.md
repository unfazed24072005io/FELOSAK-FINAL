# Misr Cash Book

A fully functional cash book application built for Egyptian SMEs (Small & Medium Enterprises). Designed for the Misr (Egypt) market with Arabic pound (EGP) formatting throughout.

## Architecture

### Offline-First Design
- **All user data is stored locally** on the device via AsyncStorage
- The app makes ZERO API calls for data operations
- Works completely without internet after initial app load
- Each user's data is private and stays on their device

### Backend (Minimal)
- Express.js serves ONLY the landing page and static app bundle
- NO database, NO API routes for user data
- Stateless — can handle any number of users since it only serves files
- For production scale: add a CDN in front for static assets

### Data Storage Keys (AsyncStorage)
- `misr_transactions` — all income/expense transactions
- `misr_debts` — all AR/AP entries
- `misr_pin` — PIN lock code

### Input Validation
- Amount parsing: handles commas (1,500), Arabic numerals (١٢٣), Arabic decimal separator (٫)
- Date validation: enforces YYYY-MM-DD format
- All interactive elements have accessibility labels

## Tech Stack
- **Frontend**: Expo React Native (Expo Router, file-based routing)
- **Backend**: Express.js (TypeScript) — serves static files and landing page only
- **Storage**: AsyncStorage (offline-first, no internet required)
- **UI**: React Native StyleSheet, @expo/vector-icons, expo-haptics

## App Features

### Core Cash Book
- Add income and expense transactions with categories
- EGP (ج.م) formatting with proper thousands separators
- Offline-first — all data stored locally via AsyncStorage
- Date tracking for every entry

### Dashboard (Overview)
- Net balance display with income/expense breakdown
- Quick action buttons (Add Income, Add Expense, Add AR/AP)
- Recent transactions list
- Settings access for PIN management

### Transactions Screen
- Full transaction list with filter by All / Income / Expense
- Tap to edit, long-press to delete (with confirmation)
- Category-based organization

### AR/AP Tracker (Debtors Screen)
- Track who owes you (Accounts Receivable)
- Track who you owe (Accounts Payable)
- Due dates with overdue warnings
- One-tap settle functionality
- Running totals per direction

### Analytics Screen
- 6-month income vs expense bar chart
- Top income sources breakdown with percentage bars
- Top expense categories breakdown
- Savings rate calculator
- Net balance, total income, total expense stat cards

### Security (Settings)
- PIN lock protection (4-digit)
- Lock now / Change PIN / Remove PIN
- PIN lock overlay with haptic feedback and shake animation on error

## App Structure
```
app/
  _layout.tsx          # Root layout with AppProvider + PinLockOverlay
  (tabs)/
    _layout.tsx        # Tab navigation (NativeTabs on iOS 26, classic tabs elsewhere)
    index.tsx          # Dashboard / Overview
    transactions.tsx   # Transactions list
    debtors.tsx        # AR/AP tracker
    analytics.tsx      # Charts & analytics
  add-transaction.tsx  # Add/edit transaction (form sheet, keyboard-aware)
  add-debt.tsx         # Add/edit AR/AP entry (form sheet, keyboard-aware)
  settings.tsx         # App settings (PIN)
context/
  AppContext.tsx        # Global state with AsyncStorage persistence
utils/
  format.ts            # EGP formatting, date validation, Arabic numeral normalization
components/
  PinLockOverlay.tsx   # PIN lock fullscreen overlay
  ErrorBoundary.tsx    # Error boundary
  ErrorFallback.tsx    # Error fallback UI
constants/
  colors.ts            # Dark (deep green + gold) and light theme
server/
  index.ts             # Express server - static files only
  routes.ts            # Empty - no API routes (all data is local)
```

## Design
- **Dark theme**: Deep forest green (#0A1F15) with gold (#C9A84C) accents
- **Light theme**: Warm parchment (#F7F5F0) with dark green accents
- Font: Inter (400, 500, 600, 700)
- Egyptian market context: EGP currency symbol ج.م throughout

## Workflows
- `Start Backend`: `npm run server:dev` — Express on port 5000
- `Start Frontend`: `npm run expo:dev` — Expo Metro on port 8081
