import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Navigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, CircularProgress } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import DeveloperBoardIcon from '@mui/icons-material/DeveloperBoard';

const LoginPage = () => {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1e1e1e'
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '400px',
          width: '100%',
          backgroundColor: '#2d2d2d',
          color: 'white'
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'white', fontWeight: 300 }}>
          RPM 
        </Typography>
        
        <Typography variant="subtitle1" sx={{ mb: 4, color: '#888', textAlign: 'center' }}>
          Process monitoring for resource-constrained QNX systems
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          backgroundColor: '#1976d2',
          borderRadius: '8px',
          padding: '20px',
          width: '140px',
          height: '140px',
          mb: 4
        }}>
          <DeveloperBoardIcon sx={{ fontSize: 48, color: 'white', mb: 1 }} />
          <Typography 
            variant="h5" 
            sx={{ 
              color: 'white', 
              fontWeight: 'bold',
              letterSpacing: '1px',
              mb: 0.5
            }}
          >
            QNX
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'white',
              letterSpacing: '2px',
              fontSize: '0.75rem',
              textAlign: 'center'
            }}
          >
            NEUTRINO
            <br />
            RTOS
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="large"
          onClick={() => loginWithRedirect()}
          startIcon={<LoginIcon />}
          sx={{ 
            width: '100%',
            py: 1.5,
            backgroundColor: '#1976d2',
            '&:hover': {
              backgroundColor: '#1565c0'
            }
          }}
        >
          Log In with Auth0
        </Button>

        <Typography variant="body2" sx={{ mt: 3, color: '#888' }}>
          Sign in to access process monitoring tools.
        </Typography>
      </Paper>
    </Box>
  );
};

export default LoginPage; 