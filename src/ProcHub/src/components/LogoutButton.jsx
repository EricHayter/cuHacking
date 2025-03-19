import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

const LogoutButton = () => {
  const { logout, isAuthenticated } = useAuth0();

  return (
    isAuthenticated && (
      <Button 
        color="inherit" 
        onClick={() => logout({ returnTo: window.location.origin })}
        startIcon={<LogoutIcon />}
      >
        Log Out
      </Button>
    )
  );
};

export default LogoutButton; 