'use strict';
require('./instrument');
const Sentry = require('@sentry/node');
const express=require('express');
const {createServer}=require('http');
const {Server}=require('socket.io');
const validation=require('./libs/unalib');
const telemetry=require('./telemetry');
function createChatServer() {
 const app=express();
 const http=createServer(app);
 const io=new Server(http,{maxHttpBufferSize:16000});
 app.use((_req,res,next)=>{
   res.set('X-Content-Type-Options','nosniff');
   res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' http: https:; media-src 'self' http: https:; frame-src https://www.youtube-nocookie.com; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'");
   next();
 });
 app.get('/',(_req,res)=>res.sendFile(__dirname+'/index.html'));
 app.use(express.static(__dirname+'/public'));
 // Adaptador HTTP local: comparte validacion y difusion con el chat Socket.IO.
 if (process.env.OTEL_ENABLED === 'true') {
   app.post('/api/messages', express.json({limit: '16kb'}), (req, res) => {
     const testRunId = (req.get('X-Lab-Test') || 'functional-http').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
     const result = telemetry.processMessage(JSON.stringify(req.body), validation.validarMensaje, {
       transport: 'http', test_run_id: testRunId,
     });
     if (result.ok) io.emit('Evento-Mensaje-Server', JSON.stringify(result));
     res.status(result.ok ? 200 : 422).json(result);
   });
 }

 io.on('connection',socket=>socket.on('Evento-Mensaje-Server',(raw,ack)=>{
   const result=telemetry.processMessage(raw, validation.validarMensaje);
   if(result.ok) io.emit('Evento-Mensaje-Server',JSON.stringify(result));
   else socket.emit('Mensaje-Rechazado',result.error);
   if(typeof ack === 'function') ack(result);
 }));
 // Ruta temporal: deshabilitar SENTRY_TEST_ENABLED despues de la prueba.
 if (process.env.SENTRY_TEST_ENABLED === 'true') {
   app.get('/debug-sentry', (_req, res) => {
     const eventId = Sentry.captureException(
       new Error('LAB7 - Error controlado desde Render')
     );
     res.status(500).json({error: 'Prueba controlada de Sentry', eventId});
   });
 }
 return {app,http,io};
}
if(require.main===module){
 const {http}=createChatServer();
 const port=process.env.PORT || 3000;
 http.listen(port,'0.0.0.0',()=>console.log('UNA Chat escuchando en puerto '+port));
}

module.exports = { createChatServer };
