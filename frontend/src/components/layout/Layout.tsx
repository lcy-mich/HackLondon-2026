import type { ReactNode } from 'react';
import { Header } from './Header';
import { GlobalTimeSlider } from './GlobalTimeSlider';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-main flex flex-col">
      <Header />
      <GlobalTimeSlider />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        {children}
      </main>
    </div>
  );
}
