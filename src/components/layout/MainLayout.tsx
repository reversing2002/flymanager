import { FC, ReactElement, ReactNode } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

interface MainLayoutProps {
  children?: ReactNode;
}

const MainLayout: FC<MainLayoutProps> = ({ children }): ReactElement => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="h-[calc(100vh-4rem)] container mx-auto px-4 py-8">
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default MainLayout;
