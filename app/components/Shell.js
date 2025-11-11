'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function Shell({ children }) {
  const pathname = usePathname();
  const showNavbar = pathname !== '/admin/login';

  return (
    <>
      {showNavbar && <Navbar />}
      {children}
    </>
  );
}


