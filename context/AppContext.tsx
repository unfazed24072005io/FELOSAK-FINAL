import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { db } from "@/config/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  writeBatch,
} from "firebase/firestore";

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
  userId: string;
  bookId: string;
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
  userId: string;
  bookId: string;
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
  userId: string;
  bookId: string;
}

export interface CashBook {
  id: string;
  name: string;
  description: string;
  isCloud: boolean;
  role: string;
  createdAt: number;
  userId: string;
  color?: string;
  icon?: string;
}

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  amount: number;
  status: "draft" | "unpaid" | "paid" | "overdue";
  dueDate: string;
  invoiceDate: string;
  items: InvoiceItem[];
  notes: string;
  createdAt: number;
  userId: string;
  bookId: string;
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
  totalBalanceAllBooks: number;
  totalIncomeAllBooks: number;
  totalExpenseAllBooks: number;
  products: Product[];
  pin: string | null;
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, "id" | "createdAt" | "userId" | "bookId">) => Promise<void>;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  isLocked: boolean;
  addTransaction: (t: Omit<Transaction, "id" | "createdAt" | "userId" | "bookId">) => Promise<void>;
  updateTransaction: (id: string, t: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addDebt: (d: Omit<Debt, "id" | "createdAt" | "userId" | "bookId">) => Promise<void>;
  updateDebt: (id: string, d: Partial<Debt>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  addProduct: (p: Omit<Product, "id" | "createdAt" | "userId" | "bookId">) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
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

// Storage keys for local-only data
const PIN_KEY = "misr_pin";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [books, setBooks] = useState<CashBook[]>([]);
  const [activeBook, setActiveBookState] = useState<CashBook | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pin, setPinState] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [totalBalanceAllBooks, setTotalBalanceAllBooks] = useState(0);
  const [totalIncomeAllBooks, setTotalIncomeAllBooks] = useState(0);
  const [totalExpenseAllBooks, setTotalExpenseAllBooks] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Load PIN from localStorage
  useEffect(() => {
    (async () => {
      try {
        const pinRaw = localStorage.getItem(PIN_KEY);
        if (pinRaw) {
          setPinState(pinRaw);
          setIsLocked(true);
        }
      } catch (e) {
        console.error("Failed to load PIN", e);
      }
    })();
  }, []);

  const calculateAllBooksTotals = useCallback(async () => {
  if (!user) return { totalBalance: 0, totalIncome: 0, totalExpense: 0 };
  
  try {
    // Get all transactions for the user across all books
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', user.id)
    );
    
    const transactionsSnapshot = await getDocs(transactionsQuery);
    
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.type === 'income') {
        totalIncome += data.amount || 0;
      } else if (data.type === 'expense') {
        totalExpense += data.amount || 0;
      }
    });
    
    return {
      totalBalance: totalIncome - totalExpense,
      totalIncome: totalIncome,
      totalExpense: totalExpense
    };
  } catch (error) {
    console.error("Failed to calculate all books totals:", error);
    return { totalBalance: 0, totalIncome: 0, totalExpense: 0 };
  }
}, [user]);
const [allBooksTotals, setAllBooksTotals] = useState({ totalBalance: 0, totalIncome: 0, totalExpense: 0 });
useEffect(() => {
  if (user) {
    calculateAllBooksTotals().then(setAllBooksTotals);
  }
}, [user, transactions]);

  useEffect(() => {
    calculateAllBooksTotals();
  }, [user, books]);

  // Load book data
  const loadBookData = useCallback(async (book: CashBook) => {
    if (!user) {
      console.log("No user yet, waiting...");
      return;
    }

    console.log("Loading data for book:", book.id, "User:", user.id);

    try {
      setTransactions([]);
      setDebts([]);
      setProducts([]);
      setInvoices([]);

      // Load transactions
      const txQuery = query(
        collection(db, 'transactions'),
        where('bookId', '==', book.id),
        where('userId', '==', user.id),
        orderBy('date', 'desc')
      );
      const txSnapshot = await getDocs(txQuery);
      console.log("Transactions found:", txSnapshot.size);
      
      const loadedTransactions: Transaction[] = txSnapshot.docs.map(doc => ({
        id: doc.id,
        type: doc.data().type,
        amount: doc.data().amount,
        category: doc.data().category,
        note: doc.data().note || "",
        date: doc.data().date,
        paymentMode: doc.data().paymentMode || "cash",
        attachment: doc.data().attachment || "",
        createdAt: doc.data().createdAt?.toDate?.()?.getTime() || Date.now(),
        userId: doc.data().userId,
        bookId: doc.data().bookId,
      }));
      setTransactions(loadedTransactions);

      // Load debts
      const debtQuery = query(
        collection(db, 'debtors'),
        where('bookId', '==', book.id),
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc')
      );
      const debtSnapshot = await getDocs(debtQuery);
      const loadedDebts: Debt[] = debtSnapshot.docs.map(doc => ({
        id: doc.id,
        direction: doc.data().direction,
        name: doc.data().name,
        amount: doc.data().amount,
        note: doc.data().note || "",
        phone: doc.data().phone || "",
        dueDate: doc.data().dueDate || "",
        settled: doc.data().settled || false,
        createdAt: doc.data().createdAt?.toDate?.()?.getTime() || Date.now(),
        userId: doc.data().userId,
        bookId: doc.data().bookId,
      }));
      setDebts(loadedDebts);

      // Load products
      const prodQuery = query(
        collection(db, 'products'),
        where('bookId', '==', book.id),
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc')
      );
      const prodSnapshot = await getDocs(prodQuery);
      const loadedProducts: Product[] = prodSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description || "",
        price: doc.data().price,
        image: doc.data().image || "",
        category: doc.data().category || "",
        inStock: doc.data().inStock !== false,
        createdAt: doc.data().createdAt?.toDate?.()?.getTime() || Date.now(),
        userId: doc.data().userId,
        bookId: doc.data().bookId,
      }));
      setProducts(loadedProducts);

      // Load invoices
      const invoiceQuery = query(
        collection(db, 'invoices'),
        where('bookId', '==', book.id),
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc')
      );
      const invoiceSnapshot = await getDocs(invoiceQuery);
      const loadedInvoices: Invoice[] = invoiceSnapshot.docs.map(doc => ({
        id: doc.id,
        number: doc.data().number,
        customerId: doc.data().customerId,
        customerName: doc.data().customerName,
        amount: doc.data().amount,
        status: doc.data().status,
        dueDate: doc.data().dueDate,
        invoiceDate: doc.data().invoiceDate,
        items: doc.data().items || [],
        notes: doc.data().notes || "",
        createdAt: doc.data().createdAt?.toDate?.()?.getTime() || Date.now(),
        userId: doc.data().userId,
        bookId: doc.data().bookId,
      }));
      setInvoices(loadedInvoices);

    } catch (error) {
      console.error("Failed to load book data:", error);
    }
  }, [user]);

  // Invoice CRUD operations
  const addInvoice = useCallback(async (invoice: Omit<Invoice, "id" | "createdAt" | "userId" | "bookId">) => {
    if (!user || !activeBook) throw new Error("No active book or user");
    
    const newInvoice = {
      ...invoice,
      userId: user.id,
      bookId: activeBook.id,
      createdAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(db, 'invoices'), newInvoice);
    const createdInvoice: Invoice = {
      ...invoice,
      id: docRef.id,
      createdAt: Date.now(),
      userId: user.id,
      bookId: activeBook.id,
    };
    
    setInvoices(prev => [createdInvoice, ...prev]);
  }, [user, activeBook]);

  const updateInvoice = useCallback(async (id: string, invoice: Partial<Invoice>) => {
    if (!user) return;
    
    const invoiceRef = doc(db, 'invoices', id);
    await updateDoc(invoiceRef, invoice);
    
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...invoice } : inv));
  }, [user]);

  const deleteInvoice = useCallback(async (id: string) => {
    if (!user) return;
    
    const invoiceRef = doc(db, 'invoices', id);
    await deleteDoc(invoiceRef);
    
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  }, [user]);

  const setActiveBook = useCallback((book: CashBook | null) => {
    console.log("Setting active book:", book?.id, book?.name);
    setActiveBookState(book);
    
    if (book) {
      localStorage.setItem('lastActiveBookId', book.id);
      loadBookData(book);
    } else {
      localStorage.removeItem('lastActiveBookId');
      setTransactions([]);
      setDebts([]);
      setProducts([]);
      setInvoices([]);
    }
  }, [loadBookData]);

  const loadBooks = useCallback(async () => {
    setIsLoadingBooks(true);
    try {
      if (!user) {
        setBooks([]);
        return;
      }

      const q = query(
        collection(db, 'books'),
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const loadedBooks: CashBook[] = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description || "",
        isCloud: true,
        role: doc.data().role || "owner",
        createdAt: doc.data().createdAt?.toDate?.()?.getTime() || Date.now(),
        userId: doc.data().userId,
        color: doc.data().color,
        icon: doc.data().icon,
      }));

      setBooks(loadedBooks);
      
      if (loadedBooks.length > 0) {
        const lastActiveBookId = localStorage.getItem('lastActiveBookId');
        const bookToActivate = lastActiveBookId 
          ? loadedBooks.find(b => b.id === lastActiveBookId) 
          : loadedBooks[0];
        
        if (bookToActivate) {
          setActiveBook(bookToActivate);
        }
      } else if (loadedBooks.length === 0 && user) {
        const defaultBook: Omit<CashBook, "id"> = {
          name: "My Cash Book",
          description: "Default cash book",
          isCloud: true,
          role: "owner",
          createdAt: Date.now(),
          userId: user.id,
          color: "#3B82F6",
          icon: "📒",
        };
        const docRef = await addDoc(collection(db, 'books'), {
          ...defaultBook,
          createdAt: Timestamp.now(),
        });
        const newBook = { ...defaultBook, id: docRef.id };
        setBooks([newBook]);
        setActiveBook(newBook);
      }
    } catch (error) {
      console.error("Failed to load books:", error);
    } finally {
      setIsLoadingBooks(false);
    }
  }, [user, setActiveBook]);

  useEffect(() => {
    if (user && activeBook) {
      console.log("User became available, reloading data for active book");
      loadBookData(activeBook);
    }
  }, [user, activeBook, loadBookData]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const createBook = useCallback(async (name: string, description: string, isCloud: boolean) => {
    if (!user) {
      console.error("Cannot create book: User not authenticated");
      throw new Error("You must be logged in to create a book");
    }
    
    const newBook: Omit<CashBook, "id"> = {
      name,
      description,
      isCloud: true,
      role: "owner",
      createdAt: Date.now(),
      userId: user.id,
      color: "#" + Math.floor(Math.random()*16777215).toString(16),
      icon: "📒",
    };

    const docRef = await addDoc(collection(db, 'books'), {
      ...newBook,
      createdAt: Timestamp.now(),
    });
    
    const createdBook = { ...newBook, id: docRef.id };
    setBooks(prev => [createdBook, ...prev]);
    setActiveBook(createdBook);
  }, [user, setActiveBook]);

  const deleteBook = useCallback(async (id: string) => {
    if (!user) return;
    
    const batch = writeBatch(db);
    
    const txQuery = query(collection(db, 'transactions'), where('bookId', '==', id));
    const txSnapshot = await getDocs(txQuery);
    txSnapshot.forEach(doc => batch.delete(doc.ref));
    
    const debtQuery = query(collection(db, 'debtors'), where('bookId', '==', id));
    const debtSnapshot = await getDocs(debtQuery);
    debtSnapshot.forEach(doc => batch.delete(doc.ref));
    
    const prodQuery = query(collection(db, 'products'), where('bookId', '==', id));
    const prodSnapshot = await getDocs(prodQuery);
    prodSnapshot.forEach(doc => batch.delete(doc.ref));
    
    const invoiceQuery = query(collection(db, 'invoices'), where('bookId', '==', id));
    const invoiceSnapshot = await getDocs(invoiceQuery);
    invoiceSnapshot.forEach(doc => batch.delete(doc.ref));
    
    const bookRef = doc(db, 'books', id);
    batch.delete(bookRef);
    
    await batch.commit();
    
    setBooks(prev => prev.filter(b => b.id !== id));
    if (activeBook?.id === id) {
      setActiveBook(null);
    }
  }, [user, activeBook, setActiveBook]);

  const updateBook = useCallback(async (id: string, data: { name?: string; description?: string }) => {
    if (!user) return;
    
    const bookRef = doc(db, 'books', id);
    await updateDoc(bookRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
    
    setBooks(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
    if (activeBook?.id === id) {
      setActiveBookState(prev => prev ? { ...prev, ...data } : prev);
    }
  }, [user, activeBook]);

  const refreshBooks = useCallback(async () => {
    await loadBooks();
    if (activeBook) {
      await loadBookData(activeBook);
    }
  }, [loadBooks, loadBookData, activeBook]);

  const addTransaction = useCallback(async (t: Omit<Transaction, "id" | "createdAt" | "userId" | "bookId">) => {
    if (!user) throw new Error("User not authenticated");
    if (!activeBook) throw new Error("No active book selected");
    
    console.log("Adding transaction to book:", activeBook.id, "User:", user.id);
    
    const newTransaction = {
      ...t,
      userId: user.id,
      bookId: activeBook.id,
      createdAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(db, 'transactions'), newTransaction);
    console.log("Transaction saved with ID:", docRef.id);
    
    const createdTx: Transaction = {
      ...t,
      id: docRef.id,
      createdAt: Date.now(),
      userId: user.id,
      bookId: activeBook.id,
    };
    
    setTransactions(prev => [createdTx, ...prev]);
  }, [user, activeBook]);

  const updateTransaction = useCallback(async (id: string, t: Partial<Transaction>) => {
    if (!user) return;
    
    const txRef = doc(db, 'transactions', id);
    await updateDoc(txRef, t);
    
    setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, ...t } : tx));
  }, [user]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user) return;
    
    const txRef = doc(db, 'transactions', id);
    await deleteDoc(txRef);
    
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  }, [user]);

  const addDebt = useCallback(async (d: Omit<Debt, "id" | "createdAt" | "userId" | "bookId">) => {
    if (!user || !activeBook) throw new Error("No active book or user");
    
    const newDebt = {
      ...d,
      userId: user.id,
      bookId: activeBook.id,
      createdAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(db, 'debtors'), newDebt);
    const createdDebt: Debt = {
      ...d,
      id: docRef.id,
      createdAt: Date.now(),
      userId: user.id,
      bookId: activeBook.id,
    };
    
    setDebts(prev => [createdDebt, ...prev]);
  }, [user, activeBook]);

  const updateDebt = useCallback(async (id: string, d: Partial<Debt>) => {
    if (!user) return;
    
    const debtRef = doc(db, 'debtors', id);
    await updateDoc(debtRef, d);
    
    setDebts(prev => prev.map(debt => debt.id === id ? { ...debt, ...d } : debt));
  }, [user]);

  const deleteDebt = useCallback(async (id: string) => {
    if (!user) return;
    
    const debtRef = doc(db, 'debtors', id);
    await deleteDoc(debtRef);
    
    setDebts(prev => prev.filter(debt => debt.id !== id));
  }, [user]);

  const addProduct = useCallback(async (p: Omit<Product, "id" | "createdAt" | "userId" | "bookId">) => {
    if (!user || !activeBook) throw new Error("No active book or user");
    
    const newProduct = {
      ...p,
      userId: user.id,
      bookId: activeBook.id,
      createdAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(db, 'products'), newProduct);
    const createdProduct: Product = {
      ...p,
      id: docRef.id,
      createdAt: Date.now(),
      userId: user.id,
      bookId: activeBook.id,
    };
    
    setProducts(prev => [createdProduct, ...prev]);
  }, [user, activeBook]);

  const updateProduct = useCallback(async (id: string, p: Partial<Product>) => {
    if (!user) return;
    
    const prodRef = doc(db, 'products', id);
    await updateDoc(prodRef, p);
    
    setProducts(prev => prev.map(prod => prod.id === id ? { ...prod, ...p } : prod));
  }, [user]);

  const deleteProduct = useCallback(async (id: string) => {
    if (!user) return;
    
    const prodRef = doc(db, 'products', id);
    await deleteDoc(prodRef);
    
    setProducts(prev => prev.filter(prod => prod.id !== id));
  }, [user]);

  const setPin = useCallback(async (newPin: string | null) => {
    setPinState(newPin);
    if (newPin) {
      localStorage.setItem(PIN_KEY, newPin);
    } else {
      localStorage.removeItem(PIN_KEY);
    }
  }, []);

  const unlock = useCallback((enteredPin: string): boolean => {
    if (enteredPin === pin) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, [pin]);

  const lock = useCallback(() => {
    if (pin) setIsLocked(true);
  }, [pin]);

  const { totalBalance, totalIncome, totalExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    const safeTransactions = transactions || [];
    
    for (const t of safeTransactions) {
      if (t && t.type === "income") {
        income += t.amount || 0;
      } else if (t && t.type === "expense") {
        expense += t.amount || 0;
      }
    }
    
    console.log("Calculated totals - Income:", income, "Expense:", expense, "Balance:", income - expense);
    
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
      updateBook,
      transactions,
      debts,
      products,
      pin,
      invoices,
      addInvoice,
      updateInvoice,
      deleteInvoice,
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
      totalBalanceAllBooks,
      totalIncomeAllBooks,
      totalExpenseAllBooks,
    }),
    [
      books,
      activeBook,
      setActiveBook,
      createBook,
      deleteBook,
      updateBook,
      transactions,
      debts,
      products,
      pin,
      invoices,
      addInvoice,
      updateInvoice,
      deleteInvoice,
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
      totalBalanceAllBooks,
      totalIncomeAllBooks,
      totalExpenseAllBooks,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}