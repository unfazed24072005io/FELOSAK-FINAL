import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
  paymentMode: string;
  attachment: string;
  createdAt: number;
}

export interface Debt {
  id: string;
  direction: "owed_to_me" | "i_owe";
  name: string;
  amount: number;
  note: string;
  phone: string;
  dueDate: string;
  settled: boolean;
  createdAt: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
  createdAt: number;
}

export interface CashBook {
  id: string;
  name: string;
  description: string;
  isCloud: boolean;
  role: string;
  createdAt: number;
}

interface AppContextValue {
  books: CashBook[];
  activeBook: CashBook | null;
  setActiveBook: (book: CashBook | null) => void;
  createBook: (name: string, description: string, isCloud: boolean) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  updateBook: (id: string, data: { name?: string; description?: string }) => Promise<void>;
  transactions: Transaction[];
  debts: Debt[];
  products: Product[];
  pin: string | null;
  isLocked: boolean;
  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => void;
  updateTransaction: (id: string, t: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addDebt: (d: Omit<Debt, "id" | "createdAt">) => void;
  updateDebt: (id: string, d: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  addProduct: (p: Omit<Product, "id" | "createdAt">) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  setPin: (pin: string | null) => void;
  unlock: (pin: string) => boolean;
  lock: () => void;
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  refreshBooks: () => Promise<void>;
  isLoadingBooks: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

const BOOKS_KEY = "misr_books";
const PIN_KEY = "misr_pin";
const LEGACY_TX_KEY = "misr_transactions";
const LEGACY_DEBTS_KEY = "misr_debts";

function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function txKey(bookId: string) {
  return `misr_tx_${bookId}`;
}
function debtsKey(bookId: string) {
  return `misr_debts_${bookId}`;
}
function productsKey(bookId: string) {
  return `misr_products_${bookId}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [localBooks, setLocalBooks] = useState<CashBook[]>([]);
  const [cloudBooks, setCloudBooks] = useState<CashBook[]>([]);
  const [activeBook, setActiveBookState] = useState<CashBook | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pin, setPinState] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const loadVersionRef = useRef(0);

  useEffect(() => {
    if (!user) {
      setCloudBooks([]);
      if (activeBook?.isCloud) {
        setActiveBookState(null);
        setTransactions([]);
        setDebts([]);
        setProducts([]);
      }
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const [booksRaw, pinRaw, legacyTx, legacyDebts] = await Promise.all([
          AsyncStorage.getItem(BOOKS_KEY),
          AsyncStorage.getItem(PIN_KEY),
          AsyncStorage.getItem(LEGACY_TX_KEY),
          AsyncStorage.getItem(LEGACY_DEBTS_KEY),
        ]);

        if (pinRaw) {
          setPinState(pinRaw);
          setIsLocked(true);
        }

        let parsedBooks: CashBook[] = booksRaw ? JSON.parse(booksRaw) : [];

        if (parsedBooks.length === 0) {
          const defaultBook: CashBook = {
            id: genId(),
            name: "My Cash Book",
            description: "Default cash book",
            isCloud: false,
            role: "owner",
            createdAt: Date.now(),
          };
          parsedBooks = [defaultBook];
          await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(parsedBooks));

          if (legacyTx) {
            await AsyncStorage.setItem(txKey(defaultBook.id), legacyTx);
          }
          if (legacyDebts) {
            await AsyncStorage.setItem(debtsKey(defaultBook.id), legacyDebts);
          }
        }

        setLocalBooks(parsedBooks);
        setIsLoadingBooks(false);
      } catch (e) {
        console.error("Failed to load data", e);
        setIsLoadingBooks(false);
      }
    })();
  }, []);

  const fetchCloudBooks = useCallback(async () => {
    if (!user) {
      setCloudBooks([]);
      return;
    }
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/books", baseUrl);
      const res = await fetch(url.toString(), { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const mapped: CashBook[] = data.map((b: any) => ({
          id: b.id,
          name: b.name,
          description: b.description || "",
          isCloud: true,
          role: b.role,
          createdAt: new Date(b.createdAt).getTime(),
        }));
        setCloudBooks(mapped);
      }
    } catch (_e) {
      console.error("Failed to fetch cloud books");
    }
  }, [user]);

  useEffect(() => {
    fetchCloudBooks();
  }, [fetchCloudBooks]);

  const books = useMemo(
    () => [...localBooks, ...cloudBooks].sort((a, b) => b.createdAt - a.createdAt),
    [localBooks, cloudBooks]
  );

  const refreshBooks = useCallback(async () => {
    await fetchCloudBooks();
    const raw = await AsyncStorage.getItem(BOOKS_KEY);
    if (raw) setLocalBooks(JSON.parse(raw));
  }, [fetchCloudBooks]);

  const loadBookData = useCallback(async (book: CashBook, version: number) => {
    if (book.isCloud) {
      try {
        const baseUrl = getApiUrl();
        const txUrl = new URL(`/api/books/${book.id}/transactions`, baseUrl);
        const debtsUrl = new URL(`/api/books/${book.id}/debts`, baseUrl);
        const prodsUrl = new URL(`/api/books/${book.id}/products`, baseUrl);
        const [txRes, debtsRes, prodsRes] = await Promise.all([
          fetch(txUrl.toString(), { credentials: "include" }),
          fetch(debtsUrl.toString(), { credentials: "include" }),
          fetch(prodsUrl.toString(), { credentials: "include" }),
        ]);
        if (loadVersionRef.current !== version) return;
        if (txRes.ok) {
          const txData = await txRes.json();
          setTransactions(
            txData.map((t: any) => ({
              id: t.id,
              type: t.type,
              amount: parseFloat(t.amount),
              category: t.category,
              note: t.note || "",
              date: t.date,
              paymentMode: t.paymentMode || "cash",
              attachment: t.attachment || "",
              createdAt: new Date(t.createdAt).getTime(),
            }))
          );
        }
        if (debtsRes.ok) {
          const debtsData = await debtsRes.json();
          setDebts(
            debtsData.map((d: any) => ({
              id: d.id,
              direction: d.direction,
              name: d.name,
              amount: parseFloat(d.amount),
              note: d.note || "",
              phone: d.phone || "",
              dueDate: d.dueDate || "",
              settled: d.settled,
              createdAt: new Date(d.createdAt).getTime(),
            }))
          );
        }
        if (prodsRes.ok) {
          const prodsData = await prodsRes.json();
          setProducts(
            prodsData.map((p: any) => ({
              id: p.id,
              name: p.name,
              description: p.description || "",
              price: parseFloat(p.price),
              image: p.image || "",
              category: p.category || "",
              inStock: p.inStock !== false,
              createdAt: new Date(p.createdAt).getTime(),
            }))
          );
        }
      } catch (_e) {
        console.error("Failed to load cloud book data");
      }
    } else {
      const [txRaw, debtsRaw, prodsRaw] = await Promise.all([
        AsyncStorage.getItem(txKey(book.id)),
        AsyncStorage.getItem(debtsKey(book.id)),
        AsyncStorage.getItem(productsKey(book.id)),
      ]);
      if (loadVersionRef.current !== version) return;
      const parsedTxs = txRaw ? JSON.parse(txRaw) : [];
      setTransactions(parsedTxs.map((t: any) => ({
        ...t,
        paymentMode: t.paymentMode || "cash",
        attachment: t.attachment || "",
      })));
      setDebts((debtsRaw ? JSON.parse(debtsRaw) : []).map((d: any) => ({ ...d, phone: d.phone || "" })));
      setProducts(prodsRaw ? JSON.parse(prodsRaw) : []);
    }
  }, []);

  const setActiveBook = useCallback(
    (book: CashBook | null) => {
      const version = ++loadVersionRef.current;
      setActiveBookState(book);
      setTransactions([]);
      setDebts([]);
      setProducts([]);
      if (book) {
        loadBookData(book, version);
      }
    },
    [loadBookData]
  );

  const saveLocalBooks = useCallback(async (updated: CashBook[]) => {
    setLocalBooks(updated);
    await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(updated));
  }, []);

  const createBook = useCallback(
    async (name: string, description: string, isCloud: boolean) => {
      if (isCloud && user) {
        const res = await apiRequest("POST", "/api/books", { name, description });
        const data = await res.json();
        await fetchCloudBooks();
        setActiveBook({
          id: data.id,
          name: data.name,
          description: data.description || "",
          isCloud: true,
          role: "owner",
          createdAt: Date.now(),
        });
      } else {
        const newBook: CashBook = {
          id: genId(),
          name,
          description,
          isCloud: false,
          role: "owner",
          createdAt: Date.now(),
        };
        const updated = [newBook, ...localBooks];
        await saveLocalBooks(updated);
        setActiveBook(newBook);
      }
    },
    [user, localBooks, saveLocalBooks, fetchCloudBooks, setActiveBook]
  );

  const deleteBook = useCallback(
    async (id: string) => {
      const book = books.find((b) => b.id === id);
      if (!book) return;
      if (book.isCloud) {
        await apiRequest("DELETE", `/api/books/${id}`);
        await fetchCloudBooks();
      } else {
        const updated = localBooks.filter((b) => b.id !== id);
        await saveLocalBooks(updated);
        await AsyncStorage.removeItem(txKey(id));
        await AsyncStorage.removeItem(debtsKey(id));
      }
      if (activeBook?.id === id) {
        setActiveBook(null);
      }
    },
    [books, localBooks, saveLocalBooks, fetchCloudBooks, activeBook, setActiveBook]
  );

  const updateBookMeta = useCallback(
    async (id: string, data: { name?: string; description?: string }) => {
      const book = books.find((b) => b.id === id);
      if (!book) return;
      if (book.isCloud) {
        await apiRequest("PUT", `/api/books/${id}`, data);
        await fetchCloudBooks();
      } else {
        const updated = localBooks.map((b) =>
          b.id === id ? { ...b, ...data } : b
        );
        await saveLocalBooks(updated);
      }
      if (activeBook?.id === id) {
        setActiveBookState((prev) => (prev ? { ...prev, ...data } : prev));
      }
    },
    [books, localBooks, saveLocalBooks, fetchCloudBooks, activeBook]
  );

  const saveTransactions = useCallback(
    async (txs: Transaction[]) => {
      if (!activeBook) return;
      if (!activeBook.isCloud) {
        await AsyncStorage.setItem(txKey(activeBook.id), JSON.stringify(txs));
      }
    },
    [activeBook]
  );

  const saveDebts = useCallback(
    async (ds: Debt[]) => {
      if (!activeBook) return;
      if (!activeBook.isCloud) {
        await AsyncStorage.setItem(debtsKey(activeBook.id), JSON.stringify(ds));
      }
    },
    [activeBook]
  );

  const saveProducts = useCallback(
    async (ps: Product[]) => {
      if (!activeBook) return;
      if (!activeBook.isCloud) {
        await AsyncStorage.setItem(productsKey(activeBook.id), JSON.stringify(ps));
      }
    },
    [activeBook]
  );

  const addTransaction = useCallback(
    (t: Omit<Transaction, "id" | "createdAt">) => {
      if (!activeBook) return;
      if (activeBook.isCloud) {
        const bookId = activeBook.id;
        (async () => {
          try {
            const res = await apiRequest("POST", `/api/books/${bookId}/transactions`, t);
            const data = await res.json();
            const mapped: Transaction = {
              id: data.id,
              type: data.type,
              amount: parseFloat(data.amount),
              category: data.category,
              note: data.note || "",
              date: data.date,
              paymentMode: data.paymentMode || "cash",
              attachment: data.attachment || "",
              createdAt: new Date(data.createdAt).getTime(),
            };
            setTransactions((prev) => [mapped, ...prev]);
          } catch (e) {
            console.error("Failed to add cloud transaction", e);
          }
        })();
      } else {
        setTransactions((prev) => {
          const next = [{ ...t, id: genId(), createdAt: Date.now() }, ...prev];
          saveTransactions(next);
          return next;
        });
      }
    },
    [activeBook, saveTransactions]
  );

  const updateTransaction = useCallback(
    (id: string, t: Partial<Transaction>) => {
      if (!activeBook) return;
      if (activeBook.isCloud) {
        const bookId = activeBook.id;
        (async () => {
          try {
            await apiRequest("PUT", `/api/books/${bookId}/transactions/${id}`, t);
            setTransactions((prev) =>
              prev.map((tx) => (tx.id === id ? { ...tx, ...t } : tx))
            );
          } catch (e) {
            console.error("Failed to update cloud transaction", e);
          }
        })();
      } else {
        setTransactions((prev) => {
          const next = prev.map((tx) => (tx.id === id ? { ...tx, ...t } : tx));
          saveTransactions(next);
          return next;
        });
      }
    },
    [activeBook, saveTransactions]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      if (!activeBook) return;
      if (activeBook.isCloud) {
        const bookId = activeBook.id;
        (async () => {
          try {
            await apiRequest("DELETE", `/api/books/${bookId}/transactions/${id}`);
            setTransactions((prev) => prev.filter((tx) => tx.id !== id));
          } catch (e) {
            console.error("Failed to delete cloud transaction", e);
          }
        })();
      } else {
        setTransactions((prev) => {
          const next = prev.filter((tx) => tx.id !== id);
          saveTransactions(next);
          return next;
        });
      }
    },
    [activeBook, saveTransactions]
  );

  const addDebt = useCallback(
    (d: Omit<Debt, "id" | "createdAt">) => {
      if (!activeBook) return;
      if (activeBook.isCloud) {
        const bookId = activeBook.id;
        (async () => {
          try {
            const res = await apiRequest("POST", `/api/books/${bookId}/debts`, d);
            const data = await res.json();
            const mapped: Debt = {
              id: data.id,
              direction: data.direction,
              name: data.name,
              amount: parseFloat(data.amount),
              note: data.note || "",
              phone: data.phone || "",
              dueDate: data.dueDate || "",
              settled: data.settled,
              createdAt: new Date(data.createdAt).getTime(),
            };
            setDebts((prev) => [mapped, ...prev]);
          } catch (e) {
            console.error("Failed to add cloud debt", e);
          }
        })();
      } else {
        setDebts((prev) => {
          const next = [{ ...d, id: genId(), createdAt: Date.now() }, ...prev];
          saveDebts(next);
          return next;
        });
      }
    },
    [activeBook, saveDebts]
  );

  const updateDebt = useCallback(
    (id: string, d: Partial<Debt>) => {
      if (!activeBook) return;
      if (activeBook.isCloud) {
        const bookId = activeBook.id;
        (async () => {
          try {
            await apiRequest("PUT", `/api/books/${bookId}/debts/${id}`, d);
            setDebts((prev) =>
              prev.map((debt) => (debt.id === id ? { ...debt, ...d } : debt))
            );
          } catch (e) {
            console.error("Failed to update cloud debt", e);
          }
        })();
      } else {
        setDebts((prev) => {
          const next = prev.map((debt) =>
            debt.id === id ? { ...debt, ...d } : debt
          );
          saveDebts(next);
          return next;
        });
      }
    },
    [activeBook, saveDebts]
  );

  const deleteDebt = useCallback(
    (id: string) => {
      if (!activeBook) return;
      if (activeBook.isCloud) {
        const bookId = activeBook.id;
        (async () => {
          try {
            await apiRequest("DELETE", `/api/books/${bookId}/debts/${id}`);
            setDebts((prev) => prev.filter((d) => d.id !== id));
          } catch (e) {
            console.error("Failed to delete cloud debt", e);
          }
        })();
      } else {
        setDebts((prev) => {
          const next = prev.filter((d) => d.id !== id);
          saveDebts(next);
          return next;
        });
      }
    },
    [activeBook, saveDebts]
  );

  const addProduct = useCallback(
    (p: Omit<Product, "id" | "createdAt">) => {
      if (!activeBook) return;
      if (activeBook.isCloud) {
        const bookId = activeBook.id;
        (async () => {
          try {
            const res = await apiRequest("POST", `/api/books/${bookId}/products`, p);
            const data = await res.json();
            const mapped: Product = {
              id: data.id,
              name: data.name,
              description: data.description || "",
              price: parseFloat(data.price),
              image: data.image || "",
              category: data.category || "",
              inStock: data.inStock !== false,
              createdAt: new Date(data.createdAt).getTime(),
            };
            setProducts((prev) => [mapped, ...prev]);
          } catch (e) {
            console.error("Failed to add cloud product", e);
          }
        })();
      } else {
        setProducts((prev) => {
          const next = [{ ...p, id: genId(), createdAt: Date.now() }, ...prev];
          saveProducts(next);
          return next;
        });
      }
    },
    [activeBook, saveProducts]
  );

  const updateProduct = useCallback(
    (id: string, p: Partial<Product>) => {
      if (!activeBook) return;
      if (activeBook.isCloud) {
        const bookId = activeBook.id;
        (async () => {
          try {
            await apiRequest("PUT", `/api/books/${bookId}/products/${id}`, p);
            setProducts((prev) =>
              prev.map((prod) => (prod.id === id ? { ...prod, ...p } : prod))
            );
          } catch (e) {
            console.error("Failed to update cloud product", e);
          }
        })();
      } else {
        setProducts((prev) => {
          const next = prev.map((prod) =>
            prod.id === id ? { ...prod, ...p } : prod
          );
          saveProducts(next);
          return next;
        });
      }
    },
    [activeBook, saveProducts]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      if (!activeBook) return;
      if (activeBook.isCloud) {
        const bookId = activeBook.id;
        (async () => {
          try {
            await apiRequest("DELETE", `/api/books/${bookId}/products/${id}`);
            setProducts((prev) => prev.filter((p) => p.id !== id));
          } catch (e) {
            console.error("Failed to delete cloud product", e);
          }
        })();
      } else {
        setProducts((prev) => {
          const next = prev.filter((p) => p.id !== id);
          saveProducts(next);
          return next;
        });
      }
    },
    [activeBook, saveProducts]
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
      books,
      activeBook,
      setActiveBook,
      createBook,
      deleteBook,
      updateBook: updateBookMeta,
      transactions,
      debts,
      products,
      pin,
      isLocked,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addDebt,
      updateDebt,
      deleteDebt,
      addProduct,
      updateProduct,
      deleteProduct,
      setPin,
      unlock,
      lock,
      totalBalance,
      totalIncome,
      totalExpense,
      refreshBooks,
      isLoadingBooks,
    }),
    [
      books,
      activeBook,
      setActiveBook,
      createBook,
      deleteBook,
      updateBookMeta,
      transactions,
      debts,
      products,
      pin,
      isLocked,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addDebt,
      updateDebt,
      deleteDebt,
      addProduct,
      updateProduct,
      deleteProduct,
      setPin,
      unlock,
      lock,
      totalBalance,
      totalIncome,
      totalExpense,
      refreshBooks,
      isLoadingBooks,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
