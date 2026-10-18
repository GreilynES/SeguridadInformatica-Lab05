'use strict';
// La validación devuelve datos, nunca HTML ejecutable.
const imageExt = /\.(png|jpe?g|gif|bmp|webp)$/i;
const videoExt = /\.(mp4|webm|ogg)$/i;
function parseURL(value) {
  if (typeof value !== 'string' || /[\s<>"'`\\\x00-\x1f]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (/%(?:0[0-9a-f]|1[0-9a-f]|22|27|3c|3e|5c)/i.test(url.href)) return null;
    return url;
  } catch { return null; }
}
function getYTVideoId(value) {
  const url = parseURL(value);
  if (!url) return null;
  let id = null;
  if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
  if (['youtube.com', 'www.youtube.com'].includes(url.hostname)) {
    id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/embed\/([\w-]{11})$/.exec(url.pathname)?.[1];
  }
  return /^[\w-]{11}$/.test(id || '') ? id : null;
}
function classify(value) {
  const url = parseURL(value);
  if (!url) return null;
  if (imageExt.test(url.pathname)) return {tipo:'imagen', url:url.href};
  if (videoExt.test(url.pathname)) return {tipo:'video', url:url.href};
  const id = getYTVideoId(value);
  return id ? {tipo:'youtube', url:'https://www.youtube-nocookie.com/embed/'+id} : null;
}
function validarMensaje(raw) {
  const reject = error => ({ok:false, error});
  if (typeof raw !== 'string' || raw.length > 16000) return reject('Formato de mensaje inválido');
  let obj;
  try { obj = JSON.parse(raw); } catch { return reject('JSON inválido'); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj) || typeof obj.mensaje !== 'string') return reject('Mensaje inválido');
  const mensaje=obj.mensaje.trim();
  const nombre=typeof obj.nombre === 'string' ? obj.nombre.trim() || 'Anónimo' : 'Anónimo';
  if (!mensaje || mensaje.length > 2000 || nombre.length > 80) return reject('Mensaje vacío o demasiado largo');
  if (/[<>\x00-\x08\x0b\x0c\x0e-\x1f]/.test(mensaje+nombre) || /(?:javascript|vbscript|data)\s*:/i.test(mensaje)) return reject('Contenido no permitido');
  const media=classify(mensaje);
  if (!media && /(?:https?:|www\.|[a-z][a-z0-9+.-]*:\/\/)/i.test(mensaje)) return reject('URL no permitida');
  const color=/^#[0-9a-f]{6}$/i.test(obj.color || '') ? obj.color : '#1b4965';
  return {ok:true, nombre, mensaje, color, tipo:media?.tipo || 'texto', ...(media ? {url:media.url} : {})};
}
module.exports = {
  is_valid_phone: value => typeof value === 'string' && /^[+]*[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/.test(value),
  is_valid_url_image: value => {const u=parseURL(value); return !!u && imageExt.test(u.pathname);},
  is_valid_url_video: value => {const u=parseURL(value); return !!u && videoExt.test(u.pathname);},
  is_valid_yt_video: value => !!getYTVideoId(value),
  getYTVideoId, classify, validarMensaje,
  validateMessage: raw => JSON.stringify(validarMensaje(raw))
};
