import { FC, ReactElement, ReactNode } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

interface MainLayoutProps {
  children?: ReactNode;
}

const MainLayout: FC<MainLayoutProps> = ({ children }): ReactElement => {
  return (
    <div className="min-h-screen bg-slate-50 md:pl-64">
      <div className="fixed top-0 left-0 right-0 z-50 bg-white md:left-64">
        <Navbar />
      </div>
      <main className="pt-16 container mx-auto px-4 py-8">
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default MainLayout;
