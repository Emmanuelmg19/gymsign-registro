# GymSign — Registro Digital (Fase 2, primer entregable)

Formulario de alta de socios (kiosco), conectado directamente a Supabase.
Reemplaza por completo el uso de `window.storage` del prototipo original.

## Qué cambió respecto al prototipo

- **Backend real**: cada registro se guarda en Supabase vía la función `registrar_socio` (Fase 1), no en Artifacts storage.
- **Firma digital**: se sube al bucket privado `firmas` en Supabase Storage; ya no viaja en base64 dentro del registro.
- **Folio real**: lo genera la base de datos (secuencia), no `Date.now()`.
- **Menores de edad**: si la fecha de nacimiento indica menos de 18 años, aparece un paso adicional para capturar los datos del tutor — es obligatorio, la base de datos lo exige.
- **Aviso de duplicados**: si el correo o teléfono ya pertenecen a otro socio, se muestra una advertencia (no bloquea el registro — decisión confirmada).
- **Validaciones reales**: teléfono a 10 dígitos, email con formato válido, fecha de nacimiento no futura.
- **Errores visibles**: si falla el guardado (red, validación del servidor, etc.), se muestra el error en pantalla — ya no se pierde silenciosamente en la consola.

## Ajustes de campos (segunda vuelta, sobre el mismo entregable)

- **Apellido paterno y materno** separados (antes era un solo campo "Apellido").
- **Identificación oficial**: tipo (INE / CURP / Pasaporte) + número.
- **Se quitó el campo Género** por completo.
- **Dirección** ahora incluye Estado (los 32 de México, en menú desplegable) y Municipio (texto libre — sin catálogo completo, por decisión confirmada).
- **"Contacto de Emergencia"** ahora se llama **"Nombre de contacto de emergencia"**.
- **Teléfono de emergencia**: si se captura, debe tener exactamente 10 dígitos.
- **Fecha de nacimiento**: ahora son 3 menús (Día / Mes / Año) en ese orden, formato mexicano — ya no depende del idioma/configuración regional del navegador de quien lo usa.

⚠️ **Estos cambios requirieron modificar la base de datos ya desplegada.** Antes de usar esta versión del formulario, corre `08_ajustes_socio.sql` (carpeta de Fase 1) en el SQL Editor de tu proyecto Supabase — si no, el registro va a fallar porque la función `registrar_socio` en la base de datos todavía espera los parámetros viejos (apellido único, género, sin identificación).

## Ajustes de contrato, identificaciones y planes (tercera vuelta)

- **Contrato real de Sport Platinium**: se reemplazaron las cláusulas genéricas por el texto real de dos documentos que proporcionaste — "Consentimiento Informado y Exoneración de Responsabilidad" (versión adulto) y la "Carta Responsiva — Menor de Edad" (versión tutor), más el "Aviso de Privacidad" completo. El sistema muestra automáticamente la versión correcta según si el socio es menor de edad, y llena los espacios en blanco del documento original con los datos capturados en el formulario (nombre, identificación, dirección, municipio, estado, teléfono).
- **Identificación**: se agregaron **Licencia** y **Visa** al menú (ahora: INE, CURP, Pasaporte, Licencia, Visa).
- **Planes reales**: se reemplazó el catálogo genérico por el de Sport Platinium: **Mensual, Inscripción, Promoción por pago puntual, Semana, Quincena, Visita**.
- **Huella digital**: el documento original en papel incluye un recuadro de huella junto a la firma. La versión digital **no la incluye** — no es técnicamente posible capturar una huella dactilar real desde este formulario web. La firma digital (trazo + fecha/hora + IP de origen si se agrega en Fase 4) es el mecanismo de validez que sustituye a firma + huella en la versión en papel. Si esto es un problema para el gimnasio (por ejemplo, si la huella es un requisito no negociable), avísame — la alternativa sería capturar una foto de identificación con la cámara del dispositivo, pero eso es un cambio de alcance mayor que no está incluido aquí.

⚠️ Esto NO requirió cambios de estructura en la base de datos más allá de `09_identificacion_y_planes.sql` (agrega Licencia/Visa y el nuevo catálogo de planes) — el texto del contrato vive únicamente en el frontend, no en la base de datos.

## Corrección importante (cuarta vuelta): datos del tutor en el contrato

Se encontró y corrigió un error real: el contrato para menores de edad usaba por error el nombre del **socio** tanto para "quien firma como tutor" como para "el menor registrado" — nunca tomaba los datos reales del tutor. También faltaba capturar la **identificación del tutor**, que el documento legal exige explícitamente ("Yo [tutor], con número de identificación...").

Ahora corregido:
- El bloque de tutor en el formulario pide también **tipo y número de identificación del tutor** (INE, CURP, Pasaporte, Licencia, Visa).
- El contrato usa correctamente el nombre e identificación del tutor donde corresponde, y el nombre del menor donde corresponde.

⚠️ Esto requiere correr `11_identificacion_tutor.sql` (carpeta de Fase 1) en Supabase — agrega esos campos a la tabla `tutores` y actualiza `registrar_socio` para guardarlos. Sin este script, el registro de un menor de edad fallará.

## Nuevo (Fase 4): PDF real generado en servidor

Ya no depende sólo de `window.print()` del navegador. Se agregó `api/generar-contrato-pdf.ts`, una función serverless de Vercel que usa Chromium headless (Puppeteer) para generar un PDF real y consistente, sin importar el navegador/dispositivo de quien lo pide.

**⚠️ Esto NO se puede probar con `npm run dev`** — Vite no sirve rutas `/api`. Necesitas una de estas dos opciones:

1. **Desplegar a Vercel** (recomendado) y probarlo ahí directamente.
2. Instalar Vercel CLI (`npm i -g vercel`) y correr `vercel dev` en vez de `npm run dev` — eso sí simula las funciones serverless localmente.

### Variables de entorno adicionales (sólo servidor, nunca en el cliente)

Además de `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, la función necesita en **Vercel → Settings → Environment Variables**:
- `SUPABASE_URL` (mismo valor que `VITE_SUPABASE_URL`, sin el prefijo)
- `SUPABASE_SERVICE_ROLE_KEY` — la encuentras en Supabase → Settings → API → `service_role`. **Nunca la pongas en un archivo `VITE_*` ni la subas a un repo público** — con ella se puede leer/escribir cualquier tabla sin restricción de RLS.

### Cómo funciona la seguridad de este endpoint

El kiosco no tiene sesión de staff, así que el endpoint sólo permite generar el PDF de un socio registrado en **los últimos 15 minutos** — la persona puede descargar su propio contrato recién firmado, pero no puede adivinar el UUID de otro socio para bajar el suyo. Si necesitas el PDF de un registro más antiguo, se descarga desde el **Panel de Administración** (sí requiere login de staff).

### Botones en la vista de contrato

Ahora hay tres opciones tras registrarse:
- **📄 Descargar PDF** — el nuevo, generado en servidor, siempre consistente.
- **🖨️ Abrir e Imprimir (HTML)** — el mecanismo anterior, se mantiene como respaldo.
- **📋 Copiar contrato** — para pegar en Word, igual que antes.

## Qué NO cambió (fuera de alcance de este entregable)

- El PDF se sigue generando igual que antes: HTML imprimible con `window.print()` o copiar/pegar a Word. La generación de PDF en servidor (Puppeteer) es Fase 4.
- No hay login de staff en este formulario — es sólo el flujo de kiosco/autoregistro. El registro asistido por staff se agrega cuando construyamos el Panel de Administración.
- El diseño visual es el mismo del prototipo original; no se rediseñó.

## Cómo correrlo en tu máquina

1. Instala dependencias:
   ```
   npm install
   ```
2. Copia `.env.example` a `.env` y confirma los valores (ya vienen precargados con tu proyecto):
   ```
   cp .env.example .env
   ```
3. Corre en local:
   ```
   npm run dev
   ```
   Se abre en `http://localhost:5173`.

## Cómo subirlo a Vercel

1. Sube esta carpeta a un repositorio de GitHub (o usa `vercel` CLI directo desde aquí).
2. En Vercel: **New Project** → importa el repo → Framework Preset: **Vite** (debería detectarlo solo).
3. En **Environment Variables**, agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (los mismos valores de tu `.env` — la anon key es pública por diseño, está pensada para vivir en el cliente).
4. Deploy.

## Antes de usarlo con socios reales

- Prueba el flujo completo tú mismo primero (registro normal y registro de un menor de edad) apuntando a tu proyecto de Supabase.
- Verifica en el **Table Editor** de Supabase que los registros de prueba aparecen en `socios` (y `tutores` si probaste el caso de menor).
- Borra los registros de prueba antes de dar acceso real al kiosco, o dales un correo claramente de prueba para identificarlos después.
