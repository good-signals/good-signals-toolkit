
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Search, BarChart3, Lightbulb } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 md:py-20">
      <MapPin size={64} className="text-gold mb-6" />
      <h1 className="text-5xl md:text-6xl font-bold mb-6 text-primary"> {/* Removed font-serif */}
        Discover Your Next <span className="text-gold">Goldmine</span> Location
      </h1>
      <p className="text-xl md:text-2xl text-foreground max-w-3xl mb-10">
        Good Signals empowers your location-based business to prioritize markets, identify promising new sites, and quickly assess potential with AI-powered insights.
      </p>
      <Link to="/toolkit-hub">
        <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 text-lg px-8 py-6">
          Explore the Toolkit Hub
        </Button>
      </Link>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
        <FeatureCard
          icon={<Search size={32} className="text-primary" />}
          title="Territory Targeter"
          description="AI-powered scoring to rank and compare U.S. markets based on your unique strategy."
        />
        <FeatureCard
          icon={<BarChart3 size={32} className="text-primary" />}
          title="Site Prospector"
          description="Guided assessment to evaluate specific sites, generating a signal score and AI summary."
        />
        <FeatureCard
          icon={<Lightbulb size={32} className="text-primary" />}
          title="Site Treasure Map"
          description="Visualize market clusters and opportunities on an embedded map interface."
        />
      </div>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
  <div className="bg-card p-6 rounded-lg shadow-lg border border-border flex flex-col items-center">
    <div className="mb-4 text-gold">{icon}</div>
    <h3 className="text-2xl font-semibold text-primary mb-2">{title}</h3> {/* Removed font-serif */}
    <p className="text-foreground/80 text-sm">{description}</p>
  </div>
);

export default LandingPage;
