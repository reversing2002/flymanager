import { FC, ReactElement } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const MainLayout: FC = (): ReactElement => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
