
import React from 'react';
import { Link } from 'react-router-dom';

interface HeaderNavigationProps {
  user: any;
  isSuperAdmin: boolean;
}

const HeaderNavigation: React.FC<HeaderNavigationProps> = ({ user, isSuperAdmin }) => {
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
          {isSuperAdmin && (
            <Link
              to="/super-admin"
              className="text-orange-400 hover:text-orange-300 transition-colors font-medium"
            >
              Super Admin
            </Link>
          )}
        </>
      )}
    </nav>
  );
};

export default HeaderNavigation;
