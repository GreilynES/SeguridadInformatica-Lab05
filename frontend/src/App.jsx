import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Chat from './Chat';

export default function App() {
 const {isLoading, isAuthenticated, error, loginWithRedirect, logout, user} = useAuth0();
 const [actionError, setActionError] = useState('');
 const [redirecting, setRedirecting] = useState(false);
 async function login(signup = false) {
  setActionError(''); setRedirecting(true);
  try {await loginWithRedirect(signup ? {authorizationParams: {screen_hint: 'signup'}} : {});}
  catch {setActionError('No se pudo abrir Auth0. Revisa la conexión y las URLs permitidas.');setRedirecting(false);}
 }
 async function endSession() {
  try {await logout({logoutParams: {returnTo: window.location.origin}});}
  catch {setActionError('No se pudo cerrar la sesión. Inténtalo de nuevo.');}
 }
 return <main>
  <h1>UNA Chat</h1>
  <p>Seguridad Informática · Inicio de sesión con Auth0</p>
  {isLoading ? <p role="status">Comprobando sesión…</p> : <>
   {(error || actionError) && <p role="alert" className="auth-error">{actionError || error.message}</p>}
   {isAuthenticated ? <>
    <div className="session-bar"><p>Sesión de <strong>{user?.name || user?.nickname || user?.email || 'Usuario'}</strong></p><button type="button" onClick={endSession}>Cerrar sesión</button></div>
    <details><summary>Mi perfil</summary><dl><dt>Nombre</dt><dd>{user?.name || user?.nickname || 'Sin nombre'}</dd><dt>Correo</dt><dd>{user?.email || 'No disponible'}</dd></dl></details>
    <Chat key={user?.sub} user={user} />
   </> : <section aria-label="Acceso al chat">
    <h2>Entra a UNA Chat</h2><p>Inicia sesión o crea una cuenta para abrir esta interfaz del chat.</p>
    <div className="auth-actions"><button type="button" disabled={redirecting} onClick={() => login()}>Iniciar sesión</button><button type="button" disabled={redirecting} onClick={() => login(true)}>Crear cuenta</button></div>
   </section>}
  </>}
 </main>;
}
