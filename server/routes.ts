import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

async function requireBookAccess(req: Request, res: Response, next: NextFunction) {
  const bookId = req.params.id || req.params.bookId;
  const userId = req.session.userId!;
  const membership = await storage.getUserMembership(bookId, userId);
  if (!membership) {
    return res.status(403).json({ message: "Not a member of this book" });
  }
  (req as any).membership = membership;
  next();
}

async function requireBookOwner(req: Request, res: Response, next: NextFunction) {
  const membership = (req as any).membership;
  if (!membership || membership.role !== "owner") {
    return res.status(403).json({ message: "Owner access required" });
  }
  next();
}

async function requireBookEditor(req: Request, res: Response, next: NextFunction) {
  const membership = (req as any).membership;
  if (!membership || (membership.role !== "owner" && membership.role !== "editor")) {
    return res.status(403).json({ message: "Editor access required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        pool: pool as any,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "misr-cashbook-secret-dev",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    })
  );

  // ===== AUTH =====
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, displayName } = req.body;
      if (!username || !password || !displayName) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters" });
      }
      if (password.length < 4) {
        return res.status(400).json({ message: "Password must be at least 4 characters" });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }
      const user = await storage.createUser({ username, password, displayName });
      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username, displayName: user.displayName });
    } catch (e: any) {
      console.error("Register error:", e);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      const user = await storage.verifyLogin(username, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username, displayName: user.displayName });
    } catch (e: any) {
      console.error("Login error:", e);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.json(null);
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.json(null);
    }
    res.json({ id: user.id, username: user.username, displayName: user.displayName });
  });

  // ===== BOOKS =====
  app.get("/api/books", requireAuth, async (req, res) => {
    try {
      const bks = await storage.getUserBooks(req.session.userId!);
      res.json(bks);
    } catch (e: any) {
      console.error("Get books error:", e);
      res.status(500).json({ message: "Failed to fetch books" });
    }
  });

  app.post("/api/books", requireAuth, async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Book name is required" });
      }
      const book = await storage.createBook(name, description || "", req.session.userId!);
      res.json({ ...book, role: "owner" });
    } catch (e: any) {
      console.error("Create book error:", e);
      res.status(500).json({ message: "Failed to create book" });
    }
  });

  app.get("/api/books/:id", requireAuth, requireBookAccess, async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) return res.status(404).json({ message: "Book not found" });
      const members = await storage.getBookMembers(req.params.id);
      res.json({ ...book, members, role: (req as any).membership.role });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch book" });
    }
  });

  app.put("/api/books/:id", requireAuth, requireBookAccess, requireBookOwner, async (req, res) => {
    try {
      const { name, description } = req.body;
      const book = await storage.updateBook(req.params.id, { name, description });
      res.json(book);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update book" });
    }
  });

  app.delete("/api/books/:id", requireAuth, requireBookAccess, requireBookOwner, async (req, res) => {
    try {
      await storage.deleteBook(req.params.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete book" });
    }
  });

  // ===== MEMBERS =====
  app.get("/api/books/:id/members", requireAuth, requireBookAccess, async (req, res) => {
    try {
      const members = await storage.getBookMembers(req.params.id);
      res.json(members);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.post("/api/books/:id/members", requireAuth, requireBookAccess, requireBookEditor, async (req, res) => {
    try {
      const { username, role } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }
      const assignRole = role || "viewer";
      if (!["viewer", "editor"].includes(assignRole)) {
        return res.status(400).json({ message: "Role must be viewer or editor" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const existing = await storage.getUserMembership(req.params.id, user.id);
      if (existing) {
        return res.status(409).json({ message: "User is already a member" });
      }
      const member = await storage.addBookMember(req.params.id, user.id, assignRole);
      res.json({ ...member, username: user.username, displayName: user.displayName });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to add member" });
    }
  });

  app.put("/api/books/:id/members/:memberId", requireAuth, requireBookAccess, requireBookOwner, async (req, res) => {
    try {
      const { role } = req.body;
      if (!role || !["owner", "editor", "viewer"].includes(role)) {
        return res.status(400).json({ message: "Valid role required (owner, editor, viewer)" });
      }
      const m = await storage.updateMemberRole(req.params.memberId, req.params.id, role);
      res.json(m);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update member" });
    }
  });

  app.delete("/api/books/:id/members/:memberId", requireAuth, requireBookAccess, requireBookOwner, async (req, res) => {
    try {
      await storage.removeMember(req.params.memberId, req.params.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // ===== TRANSACTIONS =====
  app.get("/api/books/:id/transactions", requireAuth, requireBookAccess, async (req, res) => {
    try {
      const txs = await storage.getBookTransactions(req.params.id);
      res.json(txs);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/books/:id/transactions", requireAuth, requireBookAccess, requireBookEditor, async (req, res) => {
    try {
      const { type, amount, category, note, date } = req.body;
      if (!type || !amount || !category || !date) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const tx = await storage.addTransaction(req.params.id, { type, amount: String(amount), category, note: note || "", date }, req.session.userId!);
      res.json(tx);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to add transaction" });
    }
  });

  app.put("/api/books/:id/transactions/:txId", requireAuth, requireBookAccess, requireBookEditor, async (req, res) => {
    try {
      const { type, amount, category, note, date } = req.body;
      const updateData: any = {};
      if (type) updateData.type = type;
      if (amount !== undefined) updateData.amount = String(amount);
      if (category) updateData.category = category;
      if (note !== undefined) updateData.note = note;
      if (date) updateData.date = date;
      const tx = await storage.updateTransaction(req.params.txId, req.params.id, updateData);
      res.json(tx);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  app.delete("/api/books/:id/transactions/:txId", requireAuth, requireBookAccess, requireBookEditor, async (req, res) => {
    try {
      await storage.deleteTransaction(req.params.txId, req.params.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // ===== DEBTS =====
  app.get("/api/books/:id/debts", requireAuth, requireBookAccess, async (req, res) => {
    try {
      const debts = await storage.getBookDebts(req.params.id);
      res.json(debts);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch debts" });
    }
  });

  app.post("/api/books/:id/debts", requireAuth, requireBookAccess, requireBookEditor, async (req, res) => {
    try {
      const { direction, name, amount, note, dueDate, settled } = req.body;
      if (!direction || !name || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const debt = await storage.addDebt(req.params.id, { direction, name, amount: String(amount), note: note || "", dueDate: dueDate || "", settled: settled || false }, req.session.userId!);
      res.json(debt);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to add debt" });
    }
  });

  app.put("/api/books/:id/debts/:debtId", requireAuth, requireBookAccess, requireBookEditor, async (req, res) => {
    try {
      const { direction, name, amount, note, dueDate, settled } = req.body;
      const updateData: any = {};
      if (direction) updateData.direction = direction;
      if (name) updateData.name = name;
      if (amount !== undefined) updateData.amount = String(amount);
      if (note !== undefined) updateData.note = note;
      if (dueDate !== undefined) updateData.dueDate = dueDate;
      if (settled !== undefined) updateData.settled = settled;
      const debt = await storage.updateDebt(req.params.debtId, req.params.id, updateData);
      res.json(debt);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update debt" });
    }
  });

  app.delete("/api/books/:id/debts/:debtId", requireAuth, requireBookAccess, requireBookEditor, async (req, res) => {
    try {
      await storage.deleteDebt(req.params.debtId, req.params.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete debt" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
