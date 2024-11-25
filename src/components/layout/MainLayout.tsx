import { FC, ReactElement } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import React from "react";

const MainLayout: FC = (): ReactElement => {
  return React.createElement("div", { className: "min-h-screen bg-slate-50" }, [
    React.createElement(Navbar, { key: "navbar" }),
    React.createElement(
      "main",
      { className: "container mx-auto px-4", key: "main" },
      React.createElement(Outlet, null)
    ),
  ]);
};

export default MainLayout;
