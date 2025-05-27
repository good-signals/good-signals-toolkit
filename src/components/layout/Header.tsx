
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button'; 
import { LogIn, UserCircle, Settings, Compass } from 'lucide-react'; 

const Header = () => {
  const isLoggedIn = false; 

  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
        <Link to={isLoggedIn ? "/toolkit-hub" : "/"} className="flex items-center space-x-2">
          <Compass size={36} className="text-gold" />
          <h1 className="text-3xl font-bold text-gold"> {/* Removed font-serif */}
            Good Signals
          </h1>
        </Link>
        <nav>
          {isLoggedIn ? (
            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80">
                <UserCircle className="mr-2 h-5 w-5" />
                Account
              </Button>
              <Button variant="ghost" className="text-primary-foreground hover:bg-primary/80">
                <Settings className="mr-2 h-5 w-5" />
                Settings
              </Button>
            </div>
          ) : (
            <Link to="/toolkit-hub"> {/* Temporarily links to toolkit-hub for ease of development */}
              <Button variant="outline" className="bg-gold text-gold-foreground hover:bg-gold/90 border-gold">
                <LogIn className="mr-2 h-5 w-5" />
                Access Toolkit
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
