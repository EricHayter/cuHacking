import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

// Auth0 provider configuration
export const Auth0ProviderWithNavigate = ({ children }) => {
  const navigate = useNavigate();

  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_AUTH0_CALLBACK_URL || window.location.origin;

  if (!(domain && clientId)) {
    return (
      <div style={{ 
        padding: '20px', 
        margin: '20px', 
        border: '1px solid red',
        borderRadius: '4px',
        backgroundColor: '#ffebee'
      }}>
        <h4>Auth0 Configuration Error</h4>
        <p>Please configure your Auth0 credentials in the .env file:</p>
        <pre>
          VITE_AUTH0_DOMAIN=your-domain.auth0.com
          VITE_AUTH0_CLIENT_ID=your-client-id
          VITE_AUTH0_CALLBACK_URL=http://localhost:5173 (optional)
        </pre>
      </div>
    );
  }

  const onRedirectCallback = (appState) => {
    navigate(appState?.returnTo || window.location.pathname);
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri
      }}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
}; 