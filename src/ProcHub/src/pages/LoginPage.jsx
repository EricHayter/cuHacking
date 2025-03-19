import React, { useState } from 'react';
import { Box, Button, Paper, Typography, TextField, CircularProgress } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import { Navigate } from 'react-router-dom';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    // Simulate login process (replace with actual login logic)
    setTimeout(() => {
      if (username && password) {
        console.log('Login successful!');
        setIsAuthenticated(true); // Simulate a successful login
        localStorage.setItem('isAuthenticated', 'true');
      } else {
        alert('Please enter a valid username and password');
      }
      setIsLoading(false);
    }, 1000); // Simulating network delay
  };

  if (isAuthenticated) {
    return <Navigate to="/" />; // Redirect to dashboard after login
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f4f4f4',
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
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 300 }}>
          Login
        </Typography>

        <TextField
          label="Username"
          variant="outlined"
          fullWidth
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          label="Password"
          type="password"
          variant="outlined"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 4 }}
        />

        <Button
          variant="contained"
          size="large"
          onClick={handleLogin}
          startIcon={<LoginIcon />}
          sx={{
            width: '100%',
            py: 1.5,
            backgroundColor: '#1976d2',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
          }}
        >
          Log In
        </Button>

        <Typography variant="body2" sx={{ mt: 3, color: '#888' }}>
          Sign in to access the application.
        </Typography>
      </Paper>
    </Box>
  );
};

export default LoginPage;
