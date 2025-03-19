import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Avatar, Box, Typography, CircularProgress, Menu, MenuItem } from '@mui/material';
import LogoutButton from './LogoutButton';

const Profile = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  if (isLoading) {
    return <CircularProgress color="inherit" size={24} />;
  }

  return (
    isAuthenticated && (
      <>
        <Avatar 
          sx={{ cursor: 'pointer', ml: 1 }}
          alt={user.name}
          src={user.picture}
          onClick={handleClick}
        />
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'basic-button',
          }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle1">{user.name}</Typography>
            <Typography variant="body2" color="text.secondary">{user.email}</Typography>
          </Box>
          <MenuItem onClick={handleClose}>
            <LogoutButton />
          </MenuItem>
        </Menu>
      </>
    )
  );
};

export default Profile; 