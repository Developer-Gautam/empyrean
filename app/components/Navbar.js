'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FaBars, FaTimes, FaUserShield, FaChartBar, FaHome, FaSignOutAlt } from 'react-icons/fa';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    setIsClient(true);
    const authStatus = sessionStorage.getItem('adminAuthenticated') === 'true';
    setIsAuthenticated(authStatus);
  }, []);

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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuthenticated');
    sessionStorage.removeItem('adminUsername');
    setIsAuthenticated(false);
    window.location.href = '/';
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-white/95 backdrop-blur-lg shadow-lg border-b border-indigo-100/50' 
        : 'bg-white/80 backdrop-blur-md border-b border-indigo-100/30'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-indigo-200 group-hover:ring-indigo-400 transition-all duration-300 shadow-lg">
              <Image src="/empyreanLogo.png" alt="App Logo" fill className="object-cover" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-black bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent group-hover:from-indigo-600 group-hover:to-purple-600 transition-all duration-300">
                Empyrean Club
              </span>
              <div className="text-xs text-gray-500 font-medium">MOM System</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2">
            {isClient && isAuthenticated ? (
              <>
                <Link
                  href="/"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    pathname === '/' 
                      ? 'bg-indigo-100 text-indigo-700 shadow-md' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <FaHome className="h-4 w-4" />
                  Home
                </Link>
                
                <Link
                  href="/admin"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    pathname.startsWith('/admin') 
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <FaUserShield className="h-4 w-4" />
                  Admin Panel
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                >
                  <FaSignOutAlt className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/admin/login"
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <FaUserShield className="h-4 w-4" />
                Admin Login
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen(!open)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 lg:hidden transition-colors duration-200"
          >
            {open ? <FaTimes className="h-5 w-5" /> : <FaBars className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {open && (
          <div className="lg:hidden border-t border-gray-200 py-4 space-y-2">
            {isClient && isAuthenticated ? (
              <>
                <Link
                  href="/"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    pathname === '/' 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setOpen(false)}
                >
                  <FaHome className="h-4 w-4" />
                  Home
                </Link>
                
                <Link
                  href="/admin"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    pathname.startsWith('/admin') 
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setOpen(false)}
                >
                  <FaUserShield className="h-4 w-4" />
                  Admin Panel
                </Link>
                
                <button
                  onClick={() => { setOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
                >
                  <FaSignOutAlt className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/admin/login"
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                onClick={() => setOpen(false)}
              >
                <FaUserShield className="h-4 w-4" />
                Admin Login
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
