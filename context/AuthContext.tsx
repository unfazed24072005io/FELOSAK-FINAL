import React, { createContext, useCallback, useContext, useState, useEffect } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, getDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/config/firebase";

interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const userData = userDoc.data();
        
        setUser({
          id: firebaseUser.uid,
          username: userData?.username || firebaseUser.email?.split('@')[0] || '',
          displayName: userData?.displayName || firebaseUser.displayName || '',
          email: firebaseUser.email || '',
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    const userData = userDoc.data();
    
    setUser({
      id: firebaseUser.uid,
      username: userData?.username || email.split('@')[0],
      displayName: userData?.displayName || firebaseUser.displayName || '',
      email: firebaseUser.email || '',
    });
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Update profile
    await updateProfile(firebaseUser, { displayName });
    
    // Create user document in Firestore
    const username = email.split('@')[0];
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      username,
      displayName,
      email,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    setUser({
      id: firebaseUser.uid,
      username,
      displayName,
      email,
    });
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}