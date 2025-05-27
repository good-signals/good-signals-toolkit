
import React from 'react';
import Header from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="py-6 text-center text-muted-foreground text-sm">
        © {new Date().getFullYear()} Good Signals. All rights reserved. Find your treasure.
      </footer>
    </div>
  );
};

export default MainLayout;
