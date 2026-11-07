'use strict';
if (require.main === module && process.env.NODE_ENV !== 'test') require('dotenv').config({path: require('path').join(__dirname, '.env'), quiet: true});
require('./instrument');
const Sentry = require('@sentry/node');
const express=require('express');
const {createServer}=require('http');
const {Server}=require('socket.io');
const validation=require('./libs/unalib');
const telemetry=require('./telemetry');
const backendAuth=require('./server/auth');
const path=require('node:path');
const fs=require('node:fs');
function createChatServer({authSettings=null} = {}) {
 const app=express();
 const http=createServer(app);
 const io=new Server(http,{maxHttpBufferSize:16000});
 app.use((_req,res,next)=>{
   res.set('X-Content-Type-Options','nosniff');
   res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' http: https:; media-src 'self' http: https:; frame-src https://www.youtube-nocookie.com; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'");
   next();
 });

 app.get('/auth/config',(_req,res)=>res.json(backendAuth.publicConfig(authSettings)));
 const guard=authSettings ? backendAuth.requireSession : (_req,_res,next)=>next();
 if(authSettings) {
  app.set('trust proxy', 1);
  const middleware=backendAuth.sessionMiddleware(authSettings);
  app.use(middleware);
  // La misma sesión firmada se verifica en el handshake de Socket.IO.
  const handshakeApp=express();
  handshakeApp.set('trust proxy',1);
  handshakeApp.use(middleware);
  handshakeApp.use((req,_res,next)=>next(backendAuth.signedIn(req) ? undefined : new Error('Inicia sesión para conectar al chat.')));
  io.engine.use((req,res,next)=>{
   if(req._query.sid !== undefined) return next();
   handshakeApp(req,res,next);
  });
 }
 function serveRoom(res) {
  if(!authSettings) return res.sendFile(path.join(__dirname,'index.html'));
  const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8')
   .replace('<body><main>','<body><main><p>Sesión de <strong id="session-name">Usuario</strong> · <a href="/auth/logout">Cerrar sesión</a></p>')
   .replace('</body>','<script src="/backend-session.js"></script></body>');
  return res.type('html').send(html);
 }
 app.get('/',(req,res)=>{
  if(!authSettings) return serveRoom(res);
  return backendAuth.signedIn(req) ? res.redirect('/sala') : res.sendFile(path.join(__dirname,'public/backend-login.html'));
 });
 app.get('/sala',guard,(_req,res)=>serveRoom(res));
 app.get('/auth/me',authSettings ? guard : (_req,res)=>res.status(401).json({error:'Auth0 no está configurado.'}), (req,res)=>res.json(backendAuth.userProfile(req)));

 app.use(express.static(__dirname+'/public'));
 // Adaptador HTTP local: comparte validacion y difusion con el chat Socket.IO.
 if (process.env.OTEL_ENABLED === 'true') {
   app.post('/api/messages', guard, express.json({limit: '16kb'}), (req, res) => {
     const testRunId = (req.get('X-Lab-Test') || 'functional-http').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
     const result = telemetry.processMessage(JSON.stringify(req.body), validation.validarMensaje, {
       transport: 'http', test_run_id: testRunId,
     });
     if (result.ok) io.emit('Evento-Mensaje-Server', JSON.stringify(result));
     res.status(result.ok ? 200 : 422).json(result);
   });
 }

 io.on('connection',socket=>socket.on('Evento-Mensaje-Server',(raw,ack)=>{
   if(authSettings && backendAuth.signedIn(socket.request)) {
    try {const obj=JSON.parse(raw);obj.nombre=backendAuth.userProfile(socket.request).name.slice(0,80);raw=JSON.stringify(obj);} catch {}
   }
   const result=telemetry.processMessage(raw, validation.validarMensaje);
   if(result.ok) io.emit('Evento-Mensaje-Server',JSON.stringify(result));
   else socket.emit('Mensaje-Rechazado',result.error);
   if(typeof ack === 'function') ack(result);
 }));
 // Ruta temporal: deshabilitar SENTRY_TEST_ENABLED despues de la prueba.
 if (process.env.SENTRY_TEST_ENABLED === 'true') {
   app.get('/debug-sentry', guard, (_req, res) => {
     const eventId = Sentry.captureException(
       new Error('LAB7 - Error controlado desde Render')
     );
     res.status(500).json({error: 'Prueba controlada de Sentry', eventId});
   });
 }
 app.use((error,_req,res,_next)=>{
  if(res.headersSent) return _next(error);
  res.status(400).json({error:'No se pudo completar la autenticación. Revisa configuración, callback y sesión.'});
 });
 return {app,http,io};
}
if(require.main===module){
 backendAuth.loadAuthSettings().then(authSettings=>{
  const {http,io}=createChatServer({authSettings});
  const port=process.env.PORT || 3000;
  http.listen(port,'0.0.0.0',()=>console.log('UNA Chat escuchando en puerto '+port+(authSettings ? ' con Auth0 y Vault' : ' sin autenticación de backend')));
  const close=()=>io.close(()=>process.exit(0));
  process.once('SIGINT',close);process.once('SIGTERM',close);
 }).catch(error=>{console.error('No se inició UNA Chat: '+error.message);process.exitCode=1;});
}

module.exports = { createChatServer };
