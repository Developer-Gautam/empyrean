'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUsername, setAdminUsername] = useState('');

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = () => {
      console.log('AuthContext: Checking authentication...');
      const authStatus = sessionStorage.getItem('adminAuthenticated');
      const username = sessionStorage.getItem('adminUsername');
      console.log('AuthContext: Found auth status:', authStatus, 'username:', username);
      
      if (authStatus === 'true' && username) {
        setIsAuthenticated(true);
        setAdminUsername(username);
        console.log('AuthContext: User is authenticated');
      } else {
        console.log('AuthContext: User is not authenticated');
      }
      setIsLoading(false);
    };
    
    // Check auth immediately
    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      // Check admin credentials in Firestore
      const adminRef = collection(db, 'admins');
      const q = query(adminRef, where('username', '==', username.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { success: false, error: 'Invalid username or password' };
      }

      let adminFound = false;
      querySnapshot.forEach((doc) => {
        const adminData = doc.data();
        if (adminData.password === password) {
          adminFound = true;
          // Store admin session in sessionStorage
          sessionStorage.setItem('adminAuthenticated', 'true');
          sessionStorage.setItem('adminUsername', username.trim());
          setIsAuthenticated(true);
          setAdminUsername(username.trim());
        }
      });

      if (!adminFound) {
        return { success: false, error: 'Invalid username or password' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error during login:', error);
      return { success: false, error: 'An error occurred. Please try again.' };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAdminUsername('');
    sessionStorage.removeItem('adminAuthenticated');
    sessionStorage.removeItem('adminUsername');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, adminUsername, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
