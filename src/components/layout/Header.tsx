
import React, { useState } from "react";
import HeaderLogo from "./HeaderLogo";
import HeaderNavigation from "./HeaderNavigation";
import HeaderUserMenu from "./HeaderUserMenu";
import HeaderMobileMenu from "./HeaderMobileMenu";
import { useHeaderData } from "@/hooks/useHeaderData";

const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, userAccount, signOut, isSuperAdmin } = useHeaderData();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="sticky top-0 z-50 bg-black shadow-sm border-b border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <HeaderLogo />
          
          <HeaderNavigation user={user} />

          <div className="flex items-center space-x-4">
            <HeaderUserMenu 
              user={user}
              userAccount={userAccount}
              isSuperAdmin={isSuperAdmin}
              signOut={signOut}
            />

            <HeaderMobileMenu
              user={user}
              isMobileMenuOpen={isMobileMenuOpen}
              toggleMobileMenu={toggleMobileMenu}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
