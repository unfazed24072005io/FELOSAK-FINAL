import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
  createdAt: number;
}

export interface Debt {
  id: string;
  direction: "owed_to_me" | "i_owe";
  name: string;
  amount: number;
  note: string;
  dueDate: string;
  settled: boolean;
  createdAt: number;
}

interface AppContextValue {
  transactions: Transaction[];
  debts: Debt[];
  pin: string | null;
  isLocked: boolean;
  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => void;
  updateTransaction: (id: string, t: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addDebt: (d: Omit<Debt, "id" | "createdAt">) => void;
  updateDebt: (id: string, d: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  setPin: (pin: string | null) => void;
  unlock: (pin: string) => boolean;
  lock: () => void;
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
}

const AppContext = createContext<AppContextValue | null>(null);

const TRANSACTIONS_KEY = "misr_transactions";
const DEBTS_KEY = "misr_debts";
const PIN_KEY = "misr_pin";

function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [pin, setPinState] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [txRaw, debtsRaw, pinRaw] = await Promise.all([
          AsyncStorage.getItem(TRANSACTIONS_KEY),
          AsyncStorage.getItem(DEBTS_KEY),
          AsyncStorage.getItem(PIN_KEY),
        ]);
        if (txRaw) setTransactions(JSON.parse(txRaw));
        if (debtsRaw) setDebts(JSON.parse(debtsRaw));
        if (pinRaw) {
          setPinState(pinRaw);
          setIsLocked(true);
        }
      } catch (e) {
        console.error("Failed to load data", e);
      }
    })();
  }, []);

  const saveTransactions = useCallback(async (txs: Transaction[]) => {
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txs));
  }, []);

  const saveDebts = useCallback(async (ds: Debt[]) => {
    await AsyncStorage.setItem(DEBTS_KEY, JSON.stringify(ds));
  }, []);

  const addTransaction = useCallback(
    (t: Omit<Transaction, "id" | "createdAt">) => {
      setTransactions((prev) => {
        const next = [{ ...t, id: genId(), createdAt: Date.now() }, ...prev];
        saveTransactions(next);
        return next;
      });
    },
    [saveTransactions]
  );

  const updateTransaction = useCallback(
    (id: string, t: Partial<Transaction>) => {
      setTransactions((prev) => {
        const next = prev.map((tx) => (tx.id === id ? { ...tx, ...t } : tx));
        saveTransactions(next);
        return next;
      });
    },
    [saveTransactions]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => {
        const next = prev.filter((tx) => tx.id !== id);
        saveTransactions(next);
        return next;
      });
    },
    [saveTransactions]
  );

  const addDebt = useCallback(
    (d: Omit<Debt, "id" | "createdAt">) => {
      setDebts((prev) => {
        const next = [{ ...d, id: genId(), createdAt: Date.now() }, ...prev];
        saveDebts(next);
        return next;
      });
    },
    [saveDebts]
  );

  const updateDebt = useCallback(
    (id: string, d: Partial<Debt>) => {
      setDebts((prev) => {
        const next = prev.map((debt) =>
          debt.id === id ? { ...debt, ...d } : debt
        );
        saveDebts(next);
        return next;
      });
    },
    [saveDebts]
  );

  const deleteDebt = useCallback(
    (id: string) => {
      setDebts((prev) => {
        const next = prev.filter((d) => d.id !== id);
        saveDebts(next);
        return next;
      });
    },
    [saveDebts]
  );

  const setPin = useCallback(async (newPin: string | null) => {
    setPinState(newPin);
    if (newPin) {
      await AsyncStorage.setItem(PIN_KEY, newPin);
    } else {
      await AsyncStorage.removeItem(PIN_KEY);
    }
  }, []);

  const unlock = useCallback(
    (enteredPin: string): boolean => {
      if (enteredPin === pin) {
        setIsLocked(false);
        return true;
      }
      return false;
    },
    [pin]
  );

  const lock = useCallback(() => {
    if (pin) setIsLocked(true);
  }, [pin]);

  const { totalBalance, totalIncome, totalExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return {
      totalIncome: income,
      totalExpense: expense,
      totalBalance: income - expense,
    };
  }, [transactions]);

  const value = useMemo<AppContextValue>(
    () => ({
      transactions,
      debts,
      pin,
      isLocked,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addDebt,
      updateDebt,
      deleteDebt,
      setPin,
      unlock,
      lock,
      totalBalance,
      totalIncome,
      totalExpense,
    }),
    [
      transactions,
      debts,
      pin,
      isLocked,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addDebt,
      updateDebt,
      deleteDebt,
      setPin,
      unlock,
      lock,
      totalBalance,
      totalIncome,
      totalExpense,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
