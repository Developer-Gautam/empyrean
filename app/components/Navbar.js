'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaBars, FaTimes, FaUserShield } from 'react-icons/fa';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('adminAuthenticated') === 'true';
  });

  useEffect(() => {
    const updateAuth = () => {
      const authStatus = sessionStorage.getItem('adminAuthenticated') === 'true';
      setIsAuthenticated(authStatus);
    };
    updateAuth();
    const onStorage = (e) => {
      if (e.key === 'adminAuthenticated') {
        updateAuth();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuthenticated');
    sessionStorage.removeItem('adminUsername');
    setIsAuthenticated(false);
    router.push('/admin/login');
  };

  return (
    <nav className="w-full bg-white/80 backdrop-blur border-b border-indigo-100 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-indigo-200">
            {/* Place your logo image at public/empyreanLogo.png */}
            <Image src="/empyreanLogo.png" alt="App Logo" fill className="object-cover" />
          </div>
          <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
            Empyrean Club
          </span>
        </Link>

        <button
          aria-label="Toggle menu"
          onClick={() => setOpen(!open)}
          className="p-2 rounded-md border border-gray-200 hover:bg-gray-50 sm:hidden"
        >
          {open ? <FaTimes className="h-5 w-5" /> : <FaBars className="h-5 w-5" />}
        </button>

        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-medium"
              >
                <FaUserShield className="h-4 w-4" />
                Admin Panel
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all text-sm font-medium"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/admin/login"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all text-sm font-medium"
            >
              <FaUserShield className="h-4 w-4" />
              Admin Login
            </Link>
          )}
        </div>
      </div>

      {open && (
        <div className="sm:hidden border-t border-gray-200 px-4 py-3 space-y-2">
          {isAuthenticated ? (
            <>
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-medium"
                onClick={() => setOpen(false)}
              >
                <FaUserShield className="h-4 w-4" />
                Admin Panel
              </Link>
              <button
                onClick={() => { setOpen(false); handleLogout(); }}
                className="w-full px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all text-sm font-medium"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/admin/login"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all text-sm font-medium"
              onClick={() => setOpen(false)}
            >
              <FaUserShield className="h-4 w-4" />
              Admin Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}


