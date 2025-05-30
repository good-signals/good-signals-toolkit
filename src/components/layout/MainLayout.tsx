
import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import SuperAdminAccountIndicator from "./SuperAdminAccountIndicator";

const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <SuperAdminAccountIndicator />
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
