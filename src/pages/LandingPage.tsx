
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Target, Map, Signal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const LandingPage = () => {
  const { user, authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to toolkit hub
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/toolkit-hub');
    }
  }, [user, authLoading, navigate]);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show landing page if user is not authenticated
  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-background text-foreground">
      <header className="container mx-auto px-4 py-12 text-center">
        <img 
          src="/lovable-uploads/5e1ae084-72d6-4010-b4ca-a2a23c917fbb.png" 
          alt="Good Signals mascot" 
          className="w-48 h-48 mx-auto mb-6" 
        />
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-primary">
          Welcome to Good Signals
        </h1>
        <p className="text-xl md:text-2xl text-foreground/80 mb-10 max-w-3xl mx-auto">
          We make data easy to use–so you can make moves, faster and easier.
        </p>
        <div className="flex justify-center">
          <Button asChild size="lg" variant="default" className="text-lg px-8 py-6">
            <Link to="/auth">Sign In / Sign Up</Link>
          </Button>
        </div>
      </header>

      <section className="py-16 bg-background/50 w-full">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-12 text-primary">Our Toolkit</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6 bg-card rounded-xl shadow-lg hover:shadow-primary/20 transition-shadow duration-300">
              <Target size={48} className="text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-2 text-card-foreground">Territory Targeter</h3>
              <p className="text-card-foreground/80">
                Analyze and rank markets to identify prime territories for expansion.
              </p>
            </div>
            <div className="p-6 bg-card rounded-xl shadow-lg hover:shadow-primary/20 transition-shadow duration-300">
              <Map size={48} className="text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-2 text-card-foreground">Site Treasure Map</h3>
              <p className="text-card-foreground/80">
                Visualize key site data and opportunities on an interactive map.
              </p>
            </div>
            <div className="p-6 bg-card rounded-xl shadow-lg hover:shadow-primary/20 transition-shadow duration-300">
              <Signal size={48} className="text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-2 text-card-foreground">Site Prospector</h3>
              <p className="text-card-foreground/80">
                Discover optimal locations based on demographics, competition, and custom criteria.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="w-full py-8 text-center border-t border-border">
        <p className="text-foreground/60">&copy; {new Date().getFullYear()} Good Signals. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
