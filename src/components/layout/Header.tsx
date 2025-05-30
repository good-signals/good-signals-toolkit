
import React, { useState } from "react";
import HeaderLogo from "./HeaderLogo";
import HeaderNavigation from "./HeaderNavigation";
import HeaderUserMenu from "./HeaderUserMenu";
import HeaderMobileMenu from "./HeaderMobileMenu";
import AccountSwitcher from "./AccountSwitcher";
import { useHeaderData } from "@/hooks/useHeaderData";

const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, userAccount, isSuperAdmin, signOut } = useHeaderData();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="bg-black shadow-sm border-b border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <HeaderLogo />
            <AccountSwitcher />
          </div>
          
          <HeaderNavigation user={user} isSuperAdmin={isSuperAdmin} />

          <div className="flex items-center space-x-4">
            <HeaderUserMenu 
              user={user}
              userAccount={userAccount}
              isSuperAdmin={isSuperAdmin}
              signOut={signOut}
            />

            <HeaderMobileMenu
              user={user}
              isSuperAdmin={isSuperAdmin}
              isMobileMenuOpen={isMobileMenuOpen}
              toggleMobileMenu={toggleMobileMenu}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
            />
          </div>
        </div>

        {/* Mobile Navigation Container */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-800">
              {user && (
                <>
                  <a
                    href="/toolkit-hub"
                    className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Toolkit Hub
                  </a>
                  <a
                    href="/target-metric-sets"
                    className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Target Metrics
                  </a>
                  {isSuperAdmin && (
                    <a
                      href="/super-admin"
                      className="block px-3 py-2 text-base font-medium text-orange-400 hover:text-orange-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Super Admin
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
