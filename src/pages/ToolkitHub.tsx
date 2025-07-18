
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'; // Assuming Card components exist
import { Button } from '@/components/ui/button';
import { Map, Target, Signal, Compass } from 'lucide-react';

const tools = [
  {
    title: 'Territory Targeter',
    description: 'AI-powered scoring to rank and compare U.S. markets based on prompt-driven criteria.',
    icon: <Target size={32} className="text-gold" />,
    link: '/toolkit/territory-targeter',
    cta: 'Target Markets',
  },
  {
    title: 'Site Treasure Map',
    description: 'Map viewer embedding Google My Map or ArcGIS views for market clusters or overlays.',
    icon: <Map size={32} className="text-gold" />,
    link: '/toolkit/site-treasure-map',
    cta: 'View Map',
  },
  {
    title: 'Site Prospector',
    description: 'Guided assessment tool to evaluate a specific site using brand-specific criteria.',
    icon: <Signal size={32} className="text-gold" />,
    link: '/toolkit/site-prospector',
    cta: 'Prospect Sites',
  },
];

const ToolkitHub = () => {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <Compass size={48} className="text-primary mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold mb-3 text-primary">Toolkit Hub</h1> {/* Removed font-serif */}
        <p className="text-xl text-foreground/80 max-w-2xl mx-auto">
          Your command center for unearthing valuable location insights. Select a tool to begin your expedition.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tools.map((tool) => (
          <Card key={tool.title} className="shadow-xl hover:shadow-2xl transition-shadow duration-300 border-gold/30 bg-card">
            <CardHeader className="items-center text-center">
              <div className="p-3 bg-primary/10 rounded-full mb-4">
                {tool.icon}
              </div>
              <CardTitle className="text-2xl text-primary">{tool.title}</CardTitle> {/* Removed font-serif from CardTitle default in Card component, so no change needed here explicitly unless CardTitle itself had font-serif */}
              <CardDescription className="text-foreground/70">{tool.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link to={tool.link}>
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  {tool.cta}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ToolkitHub;
