# AyniSalud — sistema web de acompañamiento

**Proyecto académico funcional (MVP)**, basado en *Sistema Web de Acompañamiento Digital y Gestión de Rutinas de Salud y Alimentación para la Mejora de la Atención en Centros de Acogida de Larga Estancia del Departamento de La Paz* (Universidad Salesiana de Bolivia, 2026), y el diagrama ER compartido para **AyniSalud**.

> ⚠️ **Solo demostración académica con datos sintéticos.** NO está certificado como dispositivo médico ni preparado para almacenar historias clínicas reales. Las alertas no sustituyen prescripciones, verificación profesional, procedimientos de seguridad ni respuesta a emergencias.

## Tecnologías elegidas

- **Frontend:** React 18 + Vite + TailwindCSS 3, componentes React y CSS accesible con gráficos.
- **Backend:** Node.js 20+ + Express, API REST, bcryptjs, JWT, control de roles, consultas parametrizadas con mysql2.
- **Base de datos:** MySQL Server 8.0+; gestionable desde **MySQL Workbench**.
- **Entorno:** Visual Studio Code + terminal de PowerShell/cmd.

## 1. Instala estos programas (Windows 10/11)

1. **Node.js LTS** (recomendado Node 22 LTS): https://nodejs.org/ . Comprueba: `node -v` y `npm -v`.
2. **MySQL Community Server 8.0 o 8.4** y **MySQL Workbench**: https://dev.mysql.com/downloads/installer/ . Durante la instalación recuerda tu usuario y contraseña (por ejemplo `root`). Verifica que el servicio MySQL esté iniciado.
3. **Visual Studio Code**: https://code.visualstudio.com/ .
4. Opcional: **Git**: https://git-scm.com/ para versionar el proyecto. NO necesitas XAMPP, Python, PHP ni Django.

> **Workbench no es el motor de la base de datos**: necesitas también **MySQL Server** ejecutándose. Conecta Workbench al servidor local `127.0.0.1:3306`.

## 2. Descomprime el ZIP y crea la base de datos

1. Extrae el ZIP y en VS Code abre la carpeta **AyniSalud** (`Archivo > Abrir carpeta`).
2. Abre **MySQL Workbench** y conecta al servidor (por ejemplo, `Local instance MySQL80`).
3. Abre el archivo `db/01_esquema.sql` desde **File > Open SQL Script**, y ejecuta todo con el icono de rayo ⚡.
4. Verifica con:

```sql
USE aynisalud_db;
SHOW TABLES;
```

Deben aparecer **9 tablas**: las **8 originales** (`roles`, `usuarios`, `residentes`, `farmacos`, `esquemas_medicacion`, `registros_medicacion`, `registros_alimentacion`, `signos_vitales`) y la adicional **`bitacoras_guardia`**, necesaria para RF07.

## 3. Configura el backend

En VS Code: **Terminal > New Terminal** (terminal PowerShell) y ejecuta:

```powershell
cd backend
Copy-Item .env.example .env
npm install
```

Abre **`backend/.env`** en VS Code y modifica obligatoriamente:

```dotenv
DB_USER=root
DB_PASSWORD=TU_CONTRASENA_DE_MYSQL
DB_NAME=aynisalud_db
JWT_SECRET=PON_AQUI_UNA_CADENA_ALEATORIA_LARGA_DE_64_CARACTERES_AL_MENOS
```

- No borres `PORT=4000` ni `DB_HOST=127.0.0.1` salvo que conozcas tu instalación.
- **JWT_SECRET** debe ser aleatorio y de **32 caracteres o más**, y NO debe contener el texto `CAMBIA_ESTO`. Puedes generarlo en terminal PowerShell con:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copia la cadena que aparezca y pégala después de `JWT_SECRET=` en `.env`.

### Cargar usuarios y datos ficticios de demostración

Después de importar `01_esquema.sql`, en la **misma terminal `backend`**:

```powershell
npm run seed
```

Esto crea roles, **5 usuarios de prueba**, **3 residentes ficticios**, dos fármacos claramente ficticios, horarios y comidas de **hoy** y un ejemplo de signos vitales. El script evita volver a insertar gran parte de los registros si ya existen.

## 4. Arranca el backend

En una terminal, **dentro de `backend`**:

```powershell
npm run dev
```

Debe salir: `AyniSalud API lista en http://localhost:4000`.

Prueba en el navegador: **http://127.0.0.1:4000/api/health**. Debe responder con `"ok":true`.

## 5. Arranca el frontend

Abre una **segunda terminal** en VS Code:

```powershell
cd frontend
npm install
npm run dev
```

Si tu terminal todavía está dentro de `backend`, escribe primero `cd ..` y luego `cd frontend`.

Ahora abre: **http://127.0.0.1:5173/**

**Alternativa para siguientes veces:** después de la instalación, haciendo doble clic en `INICIAR_WINDOWS.bat` se abren las dos terminales automáticamente.

### Usuarios de ejemplo para ingresar

| Rol | Correo de muestra | Contraseña |
|---|---|---|
| Administrador | `admin@aynisalud.local` | La definida en `DEMO_PASSWORD` de `backend/.env` |
| Enfermero | `enfermeria@aynisalud.local` | La misma contraseña demo |
| Médico | `medico@aynisalud.local` | La misma contraseña demo |
| Cuidador | `cuidador@aynisalud.local` | La misma contraseña demo |
| Familiar | `familiar@aynisalud.local` | La misma contraseña demo |

En el archivo de ejemplo `.env.example` la clave demo es **`Cambiar123!`**. Si la cambiaste **antes de `npm run seed`**, utiliza la nueva. Si la cambiaste **después** de ejecutar el seed, esa modificación no actualizará las contraseñas ya creadas; actualízalas desde administración.

## 6. Qué funciona

| Módulo | Funciones |
|---|---|
| Inicio | Contadores, agenda del día, alertas visuales, cambios de fecha, actualización automática cada 30 s. |
| Residentes | Alta, lista, vista detallada, edición, baja lógica, enlace a familiar tutor. |
| Usuarios | Creación, roles, contraseña con bcrypt, edición y desactivación. |
| Fármacos | Catálogo y stock referencial editable. |
| Medicación | Crear/editar esquemas, generar agenda por frecuencia, confirmar dosis u omisiones con registro trazable, bloqueo de duplicados. |
| Alimentación | Programación de cuatro comidas, dietas, confirmación de entregas u omisiones. |
| Signos vitales | Ingreso y consulta histórica de PA, FC, SpO₂, glucemia. |
| Bitácora | Notas por turno con responsable y residente opcional. |
| Portal familiar | SOLO los residentes vinculados al familiar autenticado y sus registros permitidos. |
| Reportes | Consulta por periodo, impresión y **Guardar como PDF** mediante diálogo de impresión del navegador. |

**Reglas de roles (resumen):** Administrador gestiona usuarios y residentes; médico gestiona esquemas y fármacos; enfermería confirma dosis, registra signos y comidas; cuidador registra comidas y notas; familiar solo consulta sus residentes. Para más detalle, ver `docs/MODULOS_Y_PRUEBAS.md`.

## 7. Estructura del proyecto

```text
AyniSalud/
├── README.md
├── INICIAR_WINDOWS.bat
├── GUIA_RAPIDA.txt
├── db/
│   ├── 01_esquema.sql          <-- pegar/ejecutar en Workbench
│   └── 02_modelo_dbdiagram.dbml
├── backend/
│   ├── .env.example            <-- copiar a .env y editar
│   ├── package.json
│   ├── tests/agendas.test.js
│   ├── scripts/
│   │   ├── seed.js             <-- genera datos ficticios
│   │   └── smoke.js            <-- prueba los endpoints
│   └── src/
│       ├── auth.js
│       ├── db.js
│       ├── utils.js
│       └── server.js
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── public/abuelitos.png    <-- ilustración para login
│   └── src/{main.jsx,App.jsx,styles.css}
└── docs/
    └── MODULOS_Y_PRUEBAS.md
```

## 8. Problemas comunes

- **`npm` no se reconoce**: Node.js no está bien instalado; ciérralo y reabre VS Code/PowerShell, comprueba `node -v`.
- **`Access denied for user 'root'`**: revisa usuario y contraseña MySQL de `backend/.env`.
- **`Unknown database 'aynisalud_db'`**: primero ejecuta `db/01_esquema.sql` en Workbench.
- **`ECONNREFUSED 127.0.0.1:3306`**: inicia el servicio de MySQL en Windows > Servicios.
- **`JWT_SECRET` error**: reemplaza el valor de ejemplo en `.env` por una cadena segura nueva de 32+ caracteres.
- **`Cannot find package` / `vite not recognized`**: ejecuta `npm install` en **cada** carpeta: `backend` y `frontend`.
- **`Port 4000` o `5173` ocupado**: cierra otras instancias; Vite usa `5173` y backend `4000` (o ajusta puertos en ambos).
- **Pantalla sin datos**: ejecuta `npm run seed` desde backend, refresca la pantalla y selecciona la fecha actual en La Paz.
- **No puedes confirmar dosis con médico**: por diseño, solo administrador y enfermero pueden hacerlo.
- **No ves familiares en el selector**: primero crea un usuario con rol `familiar`.

## 9. Pruebas de humo

Con MySQL y API **encendidos**, desde `backend` corre:

```powershell
npm run smoke
```

Se prueban salud del servidor, login administrador, residentes, agenda, comidas, signos vitales, bitácora, portal familiar y el bloqueo de acceso indebido.

## 10. Límites y siguientes mejoras (antes de un uso real)

- **Solo entorno local de demostración**. Para uso real: HTTPS, cookies de sesión HttpOnly/SameSite, políticas de retención, auditoría de acceso, backups cifrados, controles de autorización multinivel, cuentas individuales con MFA y revisión de seguridad.
- Esquemas de medicación tienen recurrencia por horas; no contempla reglas clínicas complejas, días alternos, PRN, zonas con horario de verano ni validación médica de prescripciones. El huso horario operativo de ejemplo es **La Paz, UTC-4**.
- El stock no se descuenta porque las dosis están almacenadas como texto y no existe una unidad normalizada de consumo por administración.
- Las alertas son **indicadores visuales por consulta/actualización cada 30 segundos**, no notificaciones push garantizadas ni avisos de emergencia. La clasificación de estado es operativa, no clínica.
- Los reportes se imprimen o guardan como PDF desde el navegador, **no** mediante un motor de generación PDF del servidor.
- Faltan pruebas automatizadas completas, validación de accesibilidad WCAG por auditoría externa y pruebas de carga; **no se ha acreditado** el requisito de respuesta menor de 2 s o disponibilidad del 99 %.
- Para un sistema de producción, se necesitarían versionado/migraciones de BD, auditoría inmutable de modificaciones, manejo clínico de anulaciones/correcciones, registro de alimentos omitidos con motivos y validación por profesionales.

---

**Seguridad del proyecto:** el `.env` está ignorado por Git; no subas claves a un repositorio ni utilices datos identificables de personas reales para la demostración.
