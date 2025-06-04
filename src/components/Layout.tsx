import React from 'react';
import { Compass } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-500 text-white py-4 px-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Compass className="h-6 w-6" />
            <h1 className="text-xl font-bold">Tripp'it</h1>
          </div>
          {title && <h2 className="text-lg font-medium">{title}</h2>}
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 max-w-md">
        {children}
      </main>
      <footer className="bg-gray-800 text-white py-3 text-center text-sm">
        Tripp'it © {new Date().getFullYear()} - BitLife-inspired travel companion
      </footer>
    </div>
  );
};

export default Layout;