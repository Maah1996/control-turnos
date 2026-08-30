# BITÁCORA — Sistema de Control de Turnos y Asistencia Laboral (Chile)

> Archivo vivo. Se actualiza al cerrar **cada** sesión de trabajo.
> Formato inspirado en las bitácoras de Autoevaluación GRD / Mec21.
> Para regenerar el PDF: `python bitacora_md_a_pdf.py` (cuando exista el script).

---

## Datos del proyecto

| | |
|---|---|
| **Nombre** | Control de Turnos y Asistencia — Chile |
| **Inicio** | 2026-08-30 |
| **Stack** | React + Vite + TypeScript en el frontend; **Firebase** (Firestore + Auth + Hosting) en el backend |
| **Local** | `OneDrive/0 PROGRA/23 TURNOS` |
| **Repo** | `Maah1996/control-turnos` (privado) — https://github.com/Maah1996/control-turnos |
| **Deploy** | Firebase Hosting (pendiente crear proyecto Firebase) |
| **Zona horaria** | `America/Santiago` (considerar cambio de hora / DST en cálculos) |

### Por qué este stack (decisión 2026-08-30)
El prompt maestro pedía **React + Vite + Supabase**. Se optó por **React + Vite + Firebase**:
- La grilla del calendario (multiselección, arrastre, deshacer/rehacer, borrador) es la parte
  difícil → React lo hace manejable; vanilla JS sería frágil.
- Firebase es el backend que el usuario ya domina (≈15 proyectos), con cuenta, 2FA y flujo de
  deploy conocidos. Supabase implicaría aprender RLS, migraciones SQL y un deploy nuevo.
- `writeBatch` de Firestore cubre el requisito de "operación masiva en una sola transacción"
  (hasta 500 escrituras por lote).
- Contrapartida aceptada: sin triggers de base de datos para la auditoría → los `audit_logs`
  se escriben desde la app y se blindan con reglas de Firestore. Sin SQL: el modelo relacional
  del prompt se traduce a colecciones de Firestore (ver Anexo B cuando se defina).

---

## ▶ PARA RETOMAR (leer esto al iniciar la próxima sesión)

**Estado actual:** proyecto scaffolded (Vite + React + TS). Existe la pantalla de
**Calendario de Turnos** con datos de ejemplo (mock), vistas semana/mes, filas por
trabajador y columnas por día. Sin backend todavía, sin edición todavía.

**Siguiente sesión — hacer, en orden:**
1. Revisar en vivo la grilla del calendario y confirmar diseño/legibilidad del "mural".
2. Edición **individual** de celda (panel lateral: turno, hora inicio/término, colación, notas).
3. Estado **borrador** en memoria + botón Guardar con resumen de cambios (aún sin Firebase).
4. Selector de rango quincena + rango personalizado (hoy solo semana y mes).
5. Recién después: crear proyecto Firebase + repo GitHub + primera subida.

**Pendientes de fondo (no bloquean, anotados para no olvidar):**
- Definir si el registro de asistencia será "registro oficial" (estándar RCE de la Dirección
  del Trabajo) o solo herramienta interna de gestión.
- Confirmar con asesoría laboral los umbrales de `labor_rules` antes de darlos por válidos.
- Script `bitacora_md_a_pdf.py` para llevar la bitácora también en PDF.

---

## DECISIONES TOMADAS

| Fecha | Decisión |
|---|---|
| 2026-08-30 | Stack: React + Vite + TS + Firebase (ver justificación arriba). |
| 2026-08-30 | Carpeta del proyecto: `OneDrive/0 PROGRA/23 TURNOS`. |
| 2026-08-30 | Se construye por fases; la Fase 1 (planificación + impresión) es el MVP. |
| 2026-08-30 | El calendario nunca escribe directo: borrador → Guardar → transacción + auditoría. |

---

## ESTADO POR FASES

### Fase 1 — MVP (planificación e impresión)
- [ ] ABM empresa, sucursales, áreas, cargos y trabajadores
- [ ] Tipos de turno y horarios por defecto
- [~] Calendario de turnos — vistas día/semana/quincena/mes  *(semana y mes con mock)*
- [ ] Calendario — edición individual (celda por celda)
- [ ] Calendario — edición masiva (multiselección, aplicar/limpiar/mover/reemplazar)
- [ ] Copiar semana anterior / rellenar huecos
- [ ] Plantillas semanales
- [ ] Patrones de rotación (4x3, 7x7, ciclo N semanas)
- [ ] Borrador + autosave + Guardar con resumen + deshacer/rehacer
- [ ] Motor de reglas legales + alertas en pantalla
- [ ] Impresión / exportación (PDF / Excel / CSV) semanal, quincenal, mensual
- [ ] Auditoría de cambios

### Fase 2 — Asistencia y reportes
- [ ] Registro de asistencia real
- [ ] Ausencias (licencia, permiso, vacaciones, falta)
- [ ] Dashboard
- [ ] Reportes + exportación
- [ ] Panel de Cumplimiento Legal

### Fase 3 — Extras
- [ ] Notificaciones (correo / WhatsApp)
- [ ] Flujo borrador → publicado con aviso al equipo
- [ ] Importación masiva de trabajadores desde Excel
- [ ] PWA / offline para terreno

Leyenda: `[ ]` pendiente · `[~]` en curso · `[x]` terminado y confirmado en vivo

---

## REGISTRO DE SESIONES

### Sesión 1 — 2026-08-30

**Hecho:**
- Refinado el prompt del usuario a versión profesional por fases + edición individual/masiva
  integrada + modelo de datos ampliado (ver Anexo A).
- Creada esta bitácora.
- Carpeta `23 TURNOS` creada. Proyecto scaffolded: Vite + React 19 + TypeScript.
  `git init` (rama `main`).
- **Gotcha resuelto:** el scaffold moderno de Vite trae Vite 8 con `rolldown` (binario
  nativo). La política de Application Control de Windows del equipo **bloquea ese `.node`**
  (`An Application Control policy has blocked this file`) → el dev server no arrancaba.
  Solución: fijado **Vite 7.1** + `@vitejs/plugin-react` 4.x (usan esbuild, que sí está
  permitido) y quitado `oxlint`. Dejar Vite en 7.x en este proyecto.
- Primera pantalla: **Calendario de Turnos** con datos de ejemplo:
  - Selector de vista **semana / quincena / mes** y navegación de fecha (‹ Hoy ›).
  - Selector de **alcance** (todos / por área).
  - Grilla: filas = trabajadores (con color y cargo/área), columnas = días.
  - Celdas con turno (sigla AM/PM/NOC, horario, horas netas de colación), coloreadas por
    tipo de turno. Fin de semana y "hoy" resaltados. Columna de total de horas por trabajador.
  - Cálculo de horas tolera turnos que cruzan medianoche (PM 16:00–00:30, Noche 00:00–08:00).
  - Leyenda de turnos. Botón Imprimir + hoja `@media print` (A4 horizontal) inicial.
  - Clic en celda: por ahora muestra un aviso (el panel de edición llega en la sesión 2).
- Verificado en el navegador (dev server): semana y mes renderizan OK, sin errores de consola,
  `tsc` sin errores.
- Config de preview: añadida entrada `turnos-dev` a `C:\Users\gladi\.claude\launch.json`
  (con `cwd`, porque `--prefix` con espacios en la ruta rompía el runner).

**Archivos creados:** `src/types.ts`, `src/lib/dates.ts`, `src/data/mock.ts`,
`src/components/CalendarGrid.tsx`, `src/App.tsx` (reescrito), `src/App.css` (reescrito),
`src/index.css` (reescrito), `index.html` (título + `lang=es-CL`), `.claude/launch.json`.

**Commits:** `7e0265c` — push inicial a `Maah1996/control-turnos` (privado), rama `main`.
Remote guardado sin token en la URL. Token válido: el 1º de `preferencias_usuario.md`
(`ghp_RA2kf8...KeHnF`); el del "Flujo de subida" / autopush está obsoleto.

**Pendiente para la sesión 2:** ver "▶ PARA RETOMAR".

**Confirmado en vivo por el usuario:** (pendiente — el usuario debe revisar la grilla)

---
---

# ANEXO A — PROMPT MAESTRO (versión refinada 2026-08-30)

> Esta es la especificación completa que guía la construcción. Si algo del código se
> desvía de aquí, se documenta el motivo en DECISIONES.

## 1. Contexto y objetivo

Aplicación web para planificar, publicar y controlar turnos de trabajadores en Chile. La
pantalla central es una **planilla mensual tipo calendario mural**, con columnas por día y
filas por turno o por trabajador, pensada para editarse rápido, imprimirse y publicarse en un
mural o entregarse formalmente al equipo.

El sistema debe:
- Planificar turnos por trabajador, área y sucursal, con **edición individual y masiva**.
- Permitir al encargado **elegir qué ver** (día, semana, quincena, mes o rango) y trabajar sobre esa vista.
- Registrar asistencia real y compararla con lo programado.
- Calcular días trabajados, horas ordinarias, horas extraordinarias, colación y descansos.
- Validar automáticamente el cumplimiento de la jornada legal chilena (parametrizable).
- Generar calendarios imprimibles y reportes por trabajador, semana, quincena y mes.
- Mantener trazabilidad/auditoría completa de cambios.

> **Nota legal:** las reglas de jornada se implementan como configuración editable, no fijas
> en el código. El cliente confirmará los parámetros con su asesoría laboral. Este sistema es
> una herramienta de gestión interna; si además debe operar como registro oficial de
> asistencia, debe cumplir el estándar del Registro de Control de Asistencia Electrónico (RCE)
> de la Dirección del Trabajo.

## 2. Stack técnico

- **Frontend:** React + TypeScript + Vite. UI responsiva; la grilla de turnos optimizada para escritorio.
- **Estado/servidor:** TanStack Query. Formularios con React Hook Form + Zod.
- **Backend:** Firebase (Firestore + Auth + Hosting). *(El prompt original pedía Supabase; se cambió — ver DECISIONES.)*
- **Autenticación:** Firebase Auth (email/clave). Roles y permisos por reglas de Firestore.
- **PDF:** render fiel para impresión; `@media print` como vista previa en navegador.
- **Excel/CSV:** SheetJS (xlsx) y exportación CSV nativa.
- **Zona horaria:** fechas en UTC/ISO; UI en `America/Santiago`; cálculos consideran DST y turnos que cruzan medianoche.
- **Idioma:** español (Chile). RUT con dígito verificador, fechas `dd-mm-aaaa`, miles con punto.

## 3. Alcance por fases

### Fase 1 — MVP (planificación e impresión)
1. ABM de empresa, sucursales, áreas, cargos y trabajadores.
2. Tipos de turno y horarios por defecto.
3. Calendario de turnos con vista día/semana/quincena/mes y edición individual + masiva (sección 5.3).
4. Plantillas semanales y patrones de rotación (sección 5.B).
5. Motor de reglas legales con alertas en pantalla (advertir o bloquear, según config).
6. Impresión/exportación de calendario semanal, quincenal y mensual (PDF/Excel/CSV).
7. Auditoría de cambios.

### Fase 2 — Asistencia y reportes
8. Registro de asistencia real (entrada/salida, atraso, salida anticipada, HHEE, colación, observaciones).
9. Ausencias: licencia médica, permiso, vacaciones, falta injustificada, permiso sin goce.
10. Dashboard con indicadores y listas accionables.
11. Reportes por trabajador / área / cargo / período, con exportación.
12. Panel de Cumplimiento Legal con historial de alertas y justificaciones.

### Fase 3 — Extras
13. Notificaciones (correo / WhatsApp) al publicar o cambiar turnos.
14. Flujo borrador → publicado con aviso de antelación y versiones.
15. Importación masiva de trabajadores desde Excel.
16. PWA / uso offline para supervisores en terreno.

## 4. Reglas de negocio y motor legal

Todas las reglas viven en `labor_rules`, versionadas por `effective_from`. La regla vigente
para una fecha D = la de mayor `effective_from` ≤ D.

| Código | Descripción | Valor por defecto |
|---|---|---|
| WEEKLY_MAX | Horas ordinarias semanales | 42 h (40 h desde 26-04-2028) |
| DAILY_MAX | Horas ordinarias diarias | 10 h |
| OT_DAILY_MAX | Horas extraordinarias por día | 2 h |
| WORK_DAYS | Días de trabajo por semana | mín 5 / máx 6 |
| BREAK_MIN | Colación mínima registrada | 30 min, no imputable a la jornada salvo pacto |
| REST_BETWEEN | Descanso mínimo entre turnos | 12 h (parametrizable) |
| WEEKLY_REST | Descanso semanal (domingo/festivo) | según art. 38 y excepciones |
| OVERLAP | Turnos superpuestos del mismo trabajador | prohibido |
| HOLIDAY_WORK | Trabajo en domingo/festivo irrenunciable | marca + alerta |
| AVG_WINDOW | Promediación de jornada pactada | ventana configurable hasta 4 semanas |

- Cada alerta: estado `abierta` / `justificada` / `corregida`, con nota y responsable.
- La colación se descuenta del total trabajado cuando corresponde.
- El modelo soporta turnos que cruzan medianoche.
- HHEE solo se contabilizan sobre el turno programado; recargo configurable (50% por defecto).
- El motor legal es un módulo aparte, con **una función pura por código de regla** y tests
  unitarios que incluyen turno nocturno y días con cambio de horario.

## 5. Pantallas

### 5.1 Dashboard
- Trabajadores activos del mes.
- Total de horas trabajadas por semana, quincena y mes.
- Alertas de exceso de jornada (lista accionable).
- Trabajadores con turnos incompletos o sin asignar.
- Resumen de horas ordinarias, extra, ausencias, domingos y festivos trabajados.

### 5.2 Trabajadores
- Crear, editar y desactivar trabajadores (individual y masivo).
- Datos: nombre completo, RUT (con validación DV), cargo, área, sucursal, tipo de contrato,
  horas semanales contratadas, fecha de ingreso, estado, color en la planilla, exención de
  jornada (art. 22 inc. 2).
- Vista individual con historial de turnos, asistencia, horas, días trabajados, ausencias y alertas.
- Importación desde Excel/CSV con vista previa y validación.

### 5.3 Calendario de Turnos — edición individual y masiva (núcleo de la Fase 1)

**Selector de vista y alcance (barra superior, siempre visible)**
- Rango: día · semana · quincena · mes · rango personalizado.
- Alcance: un trabajador · un área · un cargo · una sucursal · todos.
- Agrupación de filas: por trabajador · por tipo de turno (AM/PM/Noche) · por área.
- Fecha base con navegación ‹ hoy ›. Estado del selector recordado por usuario.

**Grilla de trabajo**
- Columnas = días, filas = trabajadores (o turnos, según agrupación).
- Cada celda muestra los turnos del trabajador ese día: sigla, hora inicio–término, colación, color.
- Celda vacía = sin asignar (resaltada si el trabajador está activo).
- Colores configurables por trabajador, área o tipo de turno.

**Modo 1 — Edición individual (celda por celda)**
- Clic en celda → panel/popover: trabajador, tipo de turno, fecha, hora inicio, hora término,
  minutos de colación, notas.
- Al elegir tipo de turno se autocompletan horario y colación (editables).
- Doble clic = editar. `Supr` = limpiar el día.
- `Tab`/`Enter` avanza de celda; `Ctrl+C`/`Ctrl+V` copia y pega un turno.
- Arrastrar turno = mover; con `Alt` = duplicar.
- Validación al vuelo: solape del mismo trabajador (bloquea); límites legales (advierte o bloquea).

**Modo 2 — Edición masiva**
- Multiselección: arrastre rectangular, `Shift`+clic (rango), `Ctrl`+clic (sueltas),
  clic en encabezado de día (columna), clic en nombre (fila).
- Acciones en bloque: aplicar turno · limpiar · mover ±N días · reemplazar horario.
- Asignación por formulario (Asignación Rápida integrada): trabajador(es)/área, rango de
  fechas, días de la semana, turno y horario, colación, "repetir cada semana hasta…".
  Evita doble asignación y advierte si genera exceso.
- Armar semana/mes completo: "Copiar semana anterior", plantillas semanales, patrones de
  rotación (con previsualización), "rellenar huecos".

**Guardado y confirmación**
- Trabaja como borrador: cambios acumulados y marcados (nueva/modificada/eliminada) sin escribir aún.
- Autosave del borrador por usuario.
- Botón Guardar → resumen de cambios (trabajador · fecha · antes · después) + validación legal
  del lote completo antes de confirmar. Sin conflictos → transacción única + auditoría. Con
  advertencias → lista de casos; guardar igual (alerta abierta) o volver a editar.
- Deshacer/Rehacer (`Ctrl+Z`/`Ctrl+Y`). Descartar borrador vuelve al último guardado.
- Opcional (Fase 3): borrador → publicado con aviso al equipo.

**Edición de datos del personal desde el mismo calendario**
- Clic en el nombre → mini-ficha editable (nombre, RUT, cargo, área, contrato, horas
  semanales, ingreso, estado, color).
- Botón "+ Trabajador": alta rápida sin salir del calendario.
- Edición masiva de personal: seleccionar filas → cambiar en bloque área, cargo, horas, estado.
- Importar desde Excel/CSV con vista previa y validación de RUT.
- Los cambios de personal siguen el flujo borrador → Guardar → auditoría.

**Criterios de aceptación (5.3)**
- [ ] Elige rango y alcance y la grilla se adapta.
- [ ] Crea y modifica un turno individual con validación de solape y límites legales.
- [ ] Multiselección + aplicar/limpiar/mover/reemplazar horario en bloque.
- [ ] Arma semana o mes completo con copiar semana, plantilla o patrón.
- [ ] Borrador con autosave, cambios marcados, confirmación con resumen + validación de lote.
- [ ] Deshacer/rehacer y descartar borrador.
- [ ] Crea/edita/desactiva trabajadores (individual y masivo) e importa desde Excel sin salir del calendario.
- [ ] Todo cambio (turnos y personal) queda en `audit_logs` con usuario, antes y después.

### 5.B Plantillas y patrones
- **Plantilla semanal:** asignaciones tipo (trabajador o cargo × día × turno × horario).
  Se aplica sobre cualquier semana/mes y alcance. Editable y versionable.
- **Patrón de rotación:** secuencia trabajo/libre y turnos, ciclo de N semanas y fecha de
  anclaje. Al aplicarlo se generan los turnos del rango; se previsualiza antes de escribir.
- Ambos respetan borrador → Guardar → validación legal → auditoría.

### 5.4 Registro de Asistencia (Fase 2)
- Hora real de entrada/salida. Turno programado vs. real.
- Calcular atraso, salida anticipada, horas trabajadas, colación y horas extra.
- Observaciones por día. Marcar ausencia, licencia, permiso o vacaciones.

### 5.5 Impresión y Exportación de Calendarios
- Formatos: semanal, quincenal, mensual y rango personalizado.
- Filtros: todos / trabajador / área / cargo / turno AM/PM/Noche / todos los turnos.
- Vista previa antes de imprimir.
- Impreso muestra: nombre del trabajador, día de la semana, fecha, tipo de turno, hora inicio,
  hora término, total de horas del turno y observaciones.
- Mensual = calendario/planilla tipo mural. Semanal y quincenal = filas por trabajador,
  columnas por día, priorizando legibilidad.
- Encabezado: empresa, área, período impreso, fecha de emisión, responsable.
- Pie con resumen: días trabajados por trabajador, horas programadas, domingos/festivos
  trabajados, alertas de exceso si aplica.
- Exporta a PDF listo para impresión, Excel editable y CSV.
- Hoja carta, oficio y A4; orientación vertical u horizontal.
- `@media print`: sin cortes incómodos, encabezados de tabla repetidos por página.

### 5.6 Reportes (Fase 2)
- Por trabajador: días trabajados, horas ordinarias, horas extra, domingos/festivos,
  ausencias, licencias, permisos, vacaciones.
- Semanal, quincenal y mensual. Por área o cargo. De cumplimiento legal.
- De asistencia real vs. turnos programados.
- Exportar a PDF, Excel y CSV. Filtros por trabajador, área, cargo, fecha, período y tipo de turno.

### 5.7 Cumplimiento Legal (Fase 2)
- Alertas por trabajador: exceso semanal según regla vigente, más de 10 h diarias, turnos
  superpuestos, falta de colación registrada, exceso de horas extra, trabajo en domingo o
  festivo, descanso insuficiente entre turnos.
- Config legal editable solo por Administrador, versionada por fecha de vigencia.
- Historial de alertas con filtro por trabajador, tipo y estado; justificar o corregir cada caso.

### 5.8 Configuración
- Empresa, sucursales y áreas. Cargos.
- Tipos de turno base (AM, PM, Noche u otros) y horarios por defecto.
- Feriados de Chile (con marca de irrenunciable).
- Jornada semanal vigente: 42 h desde 2026, 40 h desde 2028 (parametrizable).
- Minutos mínimos de colación y descanso mínimo entre turnos.
- Usuarios y roles. Plantillas de impresión.

## 6. Roles
- **Administrador:** acceso total: configuración, trabajadores, turnos, reportes e impresión.
- **Supervisor:** crea y edita turnos de su área, revisa reportes e imprime calendarios.
- **Trabajador:** consulta sus turnos, horas trabajadas y reportes personales.

## 7. Modelo de datos (referencia — esquema relacional del prompt)

> Se implementa sobre Firestore como colecciones equivalentes (ver Anexo B cuando se defina).
> Se conserva aquí el esquema relacional como contrato de los campos y las relaciones.

```sql
-- Multiempresa
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rut VARCHAR(12) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  timezone TEXT DEFAULT 'America/Santiago'
);

CREATE TYPE contract_type AS ENUM ('indefinido','plazo_fijo','por_obra','honorarios','part_time');
CREATE TYPE worker_status AS ENUM ('activo','inactivo','licencia','vacaciones');

CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  branch_id UUID REFERENCES branches(id),
  rut VARCHAR(12) NOT NULL,
  full_name TEXT NOT NULL,
  position TEXT,
  area TEXT,
  contract_type contract_type,
  weekly_hours NUMERIC(5,2) DEFAULT 42,
  exempt_from_workday BOOLEAN DEFAULT FALSE,
  hire_date DATE,
  status worker_status DEFAULT 'activo',
  color TEXT,
  auth_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (company_id, rut)
);

CREATE TABLE shift_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  default_start TIME NOT NULL,
  default_end TIME NOT NULL,
  crosses_midnight BOOLEAN DEFAULT FALSE,
  default_break_minutes INTEGER DEFAULT 30,
  color TEXT
);

CREATE TYPE shift_status AS ENUM ('borrador','publicado','modificado','anulado');

CREATE TABLE scheduled_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  worker_id UUID NOT NULL REFERENCES workers(id),
  shift_type_id UUID REFERENCES shift_types(id),
  shift_date DATE NOT NULL,
  planned_start TIMESTAMPTZ NOT NULL,
  planned_end   TIMESTAMPTZ NOT NULL,
  break_minutes INTEGER DEFAULT 30,
  planned_minutes INTEGER GENERATED ALWAYS AS
    (EXTRACT(EPOCH FROM (planned_end - planned_start))/60 - break_minutes) STORED,
  status shift_status DEFAULT 'borrador',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (planned_end > planned_start)
);

CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  scheduled_shift_id UUID REFERENCES scheduled_shifts(id),
  worker_id UUID NOT NULL REFERENCES workers(id),
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  break_minutes INTEGER DEFAULT 30,
  worked_minutes INTEGER,
  overtime_minutes INTEGER DEFAULT 0,
  late_minutes INTEGER DEFAULT 0,
  early_leave_minutes INTEGER DEFAULT 0,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_irrenunciable BOOLEAN DEFAULT FALSE
);

CREATE TABLE labor_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT DEFAULT 'Chile',
  effective_from DATE NOT NULL,
  weekly_limit_hours NUMERIC(5,2) NOT NULL,
  daily_limit_hours NUMERIC(5,2) DEFAULT 10,
  min_work_days_per_week INTEGER DEFAULT 5,
  max_work_days_per_week INTEGER DEFAULT 6,
  min_break_minutes INTEGER DEFAULT 30,
  min_rest_between_shifts_hours NUMERIC(4,2) DEFAULT 12,
  max_overtime_hours_day NUMERIC(5,2) DEFAULT 2,
  overtime_multiplier NUMERIC(4,2) DEFAULT 1.5,
  avg_window_weeks INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  UNIQUE (country, effective_from)
);

CREATE TYPE absence_type AS ENUM ('licencia_medica','permiso','vacaciones','falta_injustificada','permiso_sin_goce');

CREATE TABLE absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  worker_id UUID NOT NULL REFERENCES workers(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type absence_type NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TYPE alert_status AS ENUM ('abierta','justificada','corregida');

CREATE TABLE legal_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  worker_id UUID NOT NULL REFERENCES workers(id),
  rule_code TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  detail JSONB,
  status alert_status DEFAULT 'abierta',
  resolution_note TEXT,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE weekly_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  scope TEXT DEFAULT 'equipo',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE weekly_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES weekly_templates(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id),
  position TEXT,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  shift_type_id UUID REFERENCES shift_types(id),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  crosses_midnight BOOLEAN DEFAULT FALSE,
  break_minutes INTEGER DEFAULT 30
);

CREATE TABLE rotation_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  cycle_days SMALLINT NOT NULL,
  anchor_date DATE NOT NULL,
  sequence JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE schedule_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL,
  scope JSONB,
  changes JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, user_id)
);

CREATE TABLE bulk_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL,
  operation TEXT NOT NULL,
  params JSONB,
  affected_shift_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE print_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  period_type TEXT NOT NULL,
  orientation TEXT DEFAULT 'landscape',
  paper_size TEXT DEFAULT 'letter',
  show_summary BOOLEAN DEFAULT TRUE,
  show_legal_alerts BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  report_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  area TEXT,
  worker_id UUID REFERENCES workers(id),
  file_format TEXT NOT NULL,
  generated_by UUID,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reglas laborales iniciales
INSERT INTO labor_rules (effective_from, weekly_limit_hours) VALUES ('2026-04-26', 42);
INSERT INTO labor_rules (effective_from, weekly_limit_hours) VALUES ('2028-04-26', 40);
```

**Nota:** operaciones masivas en una sola transacción; validación legal sobre todo el lote
antes de escribir; registro en `bulk_operations` para revertir el lote completo. La grilla
nunca escribe directo: `schedule_drafts` → Guardar → transacción + `audit_logs`.

## 8. Requisitos no funcionales
- Responsivo; grilla optimizada para escritorio.
- Aislamiento por empresa en todas las colecciones.
- Auditoría escrita por la app y blindada por reglas de Firestore.
- Cálculo de horas centralizado en un módulo con tests (turno nocturno y DST).
- Retención de registros laborales: mínimo 5 años.
- Exportaciones deterministas.
- Accesibilidad AA y navegación por teclado en las grillas.

## 9. Diseño visual
Interfaz clara, profesional y fácil de usar. La pantalla principal parece una planilla mensual
moderna de turnos, con días de la semana, fechas, filas AM/PM (o por trabajador) y horarios
visibles. Colores suaves para diferenciar trabajadores, áreas o tipos de turno. Impresión
limpia, legible y apta para mural o entrega formal.

## 10. Entregables
- Configuración de Firebase + seed (feriados de Chile del año, reglas laborales, tipos de turno
  base, una plantilla semanal y un patrón de rotación de ejemplo).
- App desplegada + repositorio.
- Manual breve por rol.
- Suite de tests del motor legal y de las operaciones masivas (transacción + rollback de lote).

---

# ANEXO B — Mapeo a Firestore
*(pendiente — se define al empezar la integración con Firebase)*
