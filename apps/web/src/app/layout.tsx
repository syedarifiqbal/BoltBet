import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/providers/Providers';
import { ToastContainer } from '@/components/ui/ToastContainer';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BoltBet',
  description: 'High-performance live sports betting platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
