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
  const isReservationPage = location.pathname.includes("/reservations");
  const isDocumentationPage = location.pathname.includes("/documentation");
  
  // Pages nécessitant un espacement supplémentaire
  const needsExtraPadding = isReservationPage || isDocumentationPage;

  const NAVBAR_HEIGHT = "4rem"; // Définir une hauteur constante pour la navbar

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: isAIPage ? '#1E1E1E' : '#F8FAFC',
      }}
    >
      {/* Header fixe */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: NAVBAR_HEIGHT,
          zIndex: 1200,
          bgcolor: isAIPage ? '#1E1E1E' : 'white',
        }}
      >
        <Navbar />
      </Box>

      {/* Contenu principal avec padding pour éviter le chevauchement */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          marginTop: NAVBAR_HEIGHT,
          paddingX: isAIPage ? 0 : '1rem',
          paddingY: needsExtraPadding ? '3rem' : (isAIPage ? 0 : '2rem'), 
          marginLeft: { md: '16rem' },
          backgroundColor: isAIPage ? '#1E1E1E' : 'transparent',
          '& > *': {
            ...(isAIPage && {
              backgroundColor: '#1E1E1E !important',
            }),
            ...(needsExtraPadding && {
              marginTop: '1rem', 
            }),
          },
        }}
      >
        {children || <Outlet />}
      </Box>
    </Box>
  );
};

export default MainLayout;
