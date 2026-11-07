import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

function Media({message}) {
 let url;
 try {url = new URL(message.url);} catch {return <span>URL multimedia inválida</span>;}
 if (!['http:', 'https:'].includes(url.protocol)) return null;
 if (message.tipo === 'imagen') return <img src={url.href} alt="Imagen compartida" />;
 if (message.tipo === 'video') return <video src={url.href} controls preload="metadata" aria-label="Video compartido" />;
 if (message.tipo === 'youtube' && url.origin === 'https://www.youtube-nocookie.com') return <iframe src={url.href} title="Video de YouTube" width="560" height="315" allowFullScreen />;
 return null;
}
export default function Chat({user}) {
 const socketRef = useRef(null);
 const [connected, setConnected] = useState(false);
 const [messages, setMessages] = useState([]);
 const [message, setMessage] = useState('');
 const [error, setError] = useState('');
 const name = (user?.name || user?.nickname || user?.email || 'Usuario').slice(0, 80);
 useEffect(() => {
  const socket = io(); socketRef.current = socket;
  socket.on('connect', () => {setConnected(true);setError('');});
  socket.on('disconnect', () => setConnected(false));
  socket.on('connect_error', () => {setConnected(false);setError('No se pudo conectar al chat. Comprueba que el servidor está iniciado.');});
  socket.on('Mensaje-Rechazado', reason => setError(reason));
  socket.on('Evento-Mensaje-Server', raw => {
   try {const data = JSON.parse(raw);if(data.ok)setMessages(previous => [...previous, data]);}
   catch {setError('El servidor devolvió un mensaje inválido.');}
  });
  return () => {socket.removeAllListeners();socket.disconnect();socketRef.current = null;};
 }, []);
 function send(event) {
  event.preventDefault();
  if (!connected) {setError('Espera a que el chat se conecte.');return;}
  setError('');
  socketRef.current.emit('Evento-Mensaje-Server', JSON.stringify({nombre: name, mensaje: message, color: '#1b4965'}));
  setMessage('');
 }
 return <section aria-label="Sala de chat">
  <p role="status" id="connection">{connected ? 'Conectado al servidor' : 'Conectando al servidor'}</p>
  <ul id="messages" aria-label="Mensajes" aria-live="polite">{messages.map((item, index) => <li key={index}><strong>{item.nombre}: </strong>{item.tipo === 'texto' ? item.mensaje : <Media message={item} />}</li>)}</ul>
  {error && <p id="error" role="alert">{error}</p>}
  <form onSubmit={send}><label htmlFor="m">Mensaje o URL de imagen o video</label><input id="m" value={message} onChange={event => setMessage(event.target.value)} maxLength={2000} autoComplete="off" required aria-describedby="media-help" />
   <p id="media-help" className="help">Imágenes: jpg, jpeg, png, gif, bmp y webp. Videos: mp4, webm y ogg. También admite enlaces válidos de YouTube.</p>
   <button type="submit" disabled={!connected}>Enviar</button>
  </form>
 </section>;
}
