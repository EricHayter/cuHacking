import React from 'react';
import { AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

const Navbar = ({ onMenuClick }) => {
  return (
    <AppBar position="fixed">
      <Toolbar>
        <IconButton color="inherit" edge="start" onClick={onMenuClick}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Dashboard
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

