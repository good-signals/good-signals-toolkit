
import React from 'react';
import { Link } from 'react-router-dom';

interface HeaderNavigationProps {
  user: any;
}

const HeaderNavigation: React.FC<HeaderNavigationProps> = ({ user }) => {
  return (
    <nav className="hidden md:flex space-x-8">
      {user && (
        <>
          <Link
            to="/toolkit-hub"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Toolkit Hub
          </Link>
          <Link
            to="/target-metric-sets"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Target Metrics
          </Link>
        </>
      )}
    </nav>
  );
};

export default HeaderNavigation;
