const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.goto('/');await expect(page.getByRole('status')).toHaveText('Conectado al servidor');await page.getByLabel('Nombre',{exact:true}).fill('Estudiante UNA');});
async function send(page,text){await page.getByLabel('Mensaje o URL de imagen o video').fill(text);await page.getByRole('button',{name:'Enviar',exact:true}).click();}
test('imagen se muestra y termina de cargar',async({page})=>{
 await send(page,'http://127.0.0.1:3000/media/prueba.png');
 const image=page.getByRole('img',{name:'Imagen compartida'});await expect(image).toBeVisible();
 await expect.poll(()=>image.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
});
test('video muestra controles y carga contenido',async({page})=>{
 await send(page,'http://127.0.0.1:3000/media/prueba.webm');
 const video=page.getByLabel('Video compartido');await expect(video).toBeVisible();await expect(video).toHaveJSProperty('controls',true);
 await expect.poll(()=>video.evaluate(el=>el.readyState>=2&&el.videoWidth>0)).toBe(true);
});
test('script rechazado sin ejecutar alert',async({page})=>{
 const dialogs=[];page.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss();});
 await send(page,"<script>alert('Inyección de script');</script>");
 await expect(page.getByRole('alert')).toHaveText('Contenido no permitido');await expect(page.locator('#messages li')).toHaveCount(0);
 await page.waitForTimeout(300);expect(dialogs).toEqual([]);
});
test('texto con entidades se muestra sin interpretarlo como HTML',async({page})=>{
 await send(page,'&lt;img src=x onerror=alert(1)&gt;');await expect(page.locator('#messages li')).toContainText('&lt;img');await expect(page.locator('#messages img')).toHaveCount(0);
});
test('URL no permitida es rechazada',async({page})=>{await send(page,'https://example.com/file.pdf');await expect(page.getByRole('alert')).toHaveText('URL no permitida');});
