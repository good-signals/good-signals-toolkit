
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Search, BarChart3, Compass } from 'lucide-react';

const tools = [
  {
    title: 'Territory Targeter',
    description: 'AI-powered scoring to rank and compare U.S. markets based on prompt-driven criteria.',
    icon: <Search size={32} className="text-primary" />,
    link: '/toolkit/territory-targeter',
    cta: 'Target Markets',
  },
  {
    title: 'Site Treasure Map',
    description: 'Map viewer embedding Google My Map or ArcGIS views for market clusters or overlays.',
    icon: <MapPin size={32} className="text-primary" />,
    link: '/toolkit/site-treasure-map',
    cta: 'View Map',
  },
  {
    title: 'Site Prospector',
    description: 'Guided assessment tool to evaluate a specific site using brand-specific criteria.',
    icon: <BarChart3 size={32} className="text-primary" />,
    link: '/toolkit/site-prospector',
    cta: 'Prospect Sites',
  },
];

const ToolkitHub = () => {
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center mb-8">
        <Compass size={48} className="text-primary mr-4" />
        <div>
          <h1 className="text-3xl font-bold text-primary">Toolkit Hub</h1>
          <p className="text-muted-foreground">Your command center for unearthing valuable location insights. Select a tool to begin your expedition.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <Card key={tool.title} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="p-3 bg-primary/10 rounded-full mr-3">
                  {tool.icon}
                </div>
                {tool.title}
              </CardTitle>
              <CardDescription>
                {tool.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to={tool.link}>
                  {tool.cta}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ToolkitHub;
