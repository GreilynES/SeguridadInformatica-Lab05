import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import { auth0Config } from './auth0-config';
import App from './App';
import '../../public/style.css';
import './style.css';

createRoot(document.getElementById('root')).render(
 <StrictMode>
  <Auth0Provider domain={auth0Config.domain} clientId={auth0Config.clientId}
   authorizationParams={{redirect_uri: window.location.origin}}>
   <App />
  </Auth0Provider>
 </StrictMode>,
);
