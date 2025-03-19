import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';

const LoginButton = () => {
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  return (
    !isAuthenticated && (
      <Button 
        color="inherit" 
        onClick={() => loginWithRedirect()}
        startIcon={<LoginIcon />}
      >
        Log In
      </Button>
    )
  );
};

export default LoginButton; 