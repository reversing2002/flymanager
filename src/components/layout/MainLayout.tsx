import { FC, ReactElement, ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import { Box } from "@mui/material";

interface MainLayoutProps {
  children?: ReactNode;
}

const MainLayout: FC<MainLayoutProps> = ({ children }): ReactElement => {
  const location = useLocation();
  const isAIPage = location.pathname === "/welcome" && location.search.includes("ai=true");

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: isAIPage ? '#1E1E1E' : '#F8FAFC',
        paddingLeft: { md: '16rem' },
        '& .MuiContainer-root, & .MuiBox-root, & main': isAIPage ? {
          backgroundColor: '#1E1E1E !important',
        } : {},
      }}
    >
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: { xs: 0, md: '16rem' },
          right: 0,
          zIndex: 50,
          bgcolor: isAIPage ? '#1E1E1E' : 'white',
        }}
      >
        <Navbar />
      </Box>
      <Box
        component="main"
        sx={{
          paddingTop: '4rem',
          paddingX: isAIPage ? 0 : '1rem',
          paddingY: isAIPage ? 0 : '2rem',
          margin: '0 auto',
          backgroundColor: isAIPage ? '#1E1E1E' : 'transparent',
          '& > *': isAIPage ? {
            backgroundColor: '#1E1E1E !important',
          } : {},
        }}
      >
        {children || <Outlet />}
      </Box>
    </Box>
  );
};

export default MainLayout;
