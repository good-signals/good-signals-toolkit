
import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

interface HeaderMobileMenuProps {
  user: any;
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const HeaderMobileMenu: React.FC<HeaderMobileMenuProps> = ({
  user,
  isMobileMenuOpen,
  toggleMobileMenu,
  setIsMobileMenuOpen,
}) => {
  const { isSuperAdmin } = useSuperAdmin();

  // Don't show mobile menu button if user is not signed in
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
          className="text-white hover:bg-gray-800"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-800">
            <Link
              to="/toolkit-hub"
              className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Toolkit Hub
            </Link>
            <Link
              to="/target-metric-sets"
              className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Target Metrics
            </Link>
            {isSuperAdmin && (
              <Link
                to="/super-admin"
                className="block px-3 py-2 text-base font-medium text-orange-400 hover:text-orange-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Super Admin
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default HeaderMobileMenu;
