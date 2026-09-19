import { useMemo, useState } from 'react';
import type { ScheduledShift, SolicitudCambio, SolicitudTipo, Worker } from '../types';
import {
  addDays, dayName, fmtHours, fmtLong, minutesBetween, startOfWeek, toISO,
} from '../lib/dates';
import { useFirestoreCollection } from '../lib/firestoreSync';
import { WORKERS, buildMockShifts } from '../data/mock';
import { motivoColor } from '../lib/motivoColors';
import { TIPO_LABEL, fechasTexto } from '../lib/solicitudes';
import { MOTIVO_PREFIX } from './ShiftForm';
import { calcularFeriado } from '../lib/vacations';
import { FeriadoResumen } from './FeriadoResumen';
import { NewRequestForm } from './NewRequestForm';

const TIPO_OPTIONS: { value: SolicitudTipo; label: string }[] = [
  { value: 'cambio_horario', label: 'Cambiar el horario de ese día' },
  { value: 'dia_libre', label: 'Tomar el día libre' },
  { value: 'reemplazo', label: 'Proponer un reemplazo con un compañero' },
];

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

interface Props {
  onSalir: () => void;
}

export function WorkerPortal({ onSalir }: Props) {
  const workersSync = useFirestoreCollection<Worker>('workers', WORKERS);
  const shiftsSync = useFirestoreCollection<ScheduledShift>('shifts', buildMockShifts(new Date()));
  const solicitudesSync = useFirestoreCollection<SolicitudCambio>('solicitudes', []);

  const [codeInput, setCodeInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [workerId, setWorkerId] = useState<string | null>(() => sessionStorage.getItem('turnos_worker_id'));
  const [tab, setTab] = useState<'horario' | 'solicitudes'>('horario');
  const [anchor, setAnchor] = useState(new Date());

  // Formulario de nueva solicitud
  const [formOpenFor, setFormOpenFor] = useState<string | null>(null);
  const [tipo, setTipo] = useState<SolicitudTipo>('cambio_horario');
  const [motivo, setMotivo] = useState('');
  const [reemplazoId, setReemplazoId] = useState('');

  const worker = workersSync.items.find((w) => w.id === workerId) ?? null;

  const intentarEntrar = () => {
    if (!workersSync.ready) return;
    const clean = codeInput.trim();
    const found = workersSync.items.find((w) => w.code && w.code === clean);
    if (!found) {
      setLoginError('Ese código no corresponde a ningún trabajador. Pídeselo de nuevo al administrador.');
      return;
    }
    setWorkerId(found.id);
    sessionStorage.setItem('turnos_worker_id', found.id);
    setLoginError('');
  };

  const salirDelPortal = () => {
    sessionStorage.removeItem('turnos_worker_id');
    setWorkerId(null);
    onSalir();
  };

  const days = useMemo(() => {
    const from = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(from, i));
  }, [anchor]);

  const misTurnos = useMemo(
    () => shiftsSync.items.filter((s) => s.workerId === workerId && s.status !== 'anulado'),
    [shiftsSync.items, workerId],
  );

  const misSolicitudes = useMemo(
    () => solicitudesSync.items
      .filter((s) => s.workerId === workerId)
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)),
    [solicitudesSync.items, workerId],
  );

  const abrirFormulario = (iso: string) => {
    setFormOpenFor(iso);
    setTipo('cambio_horario');
    setMotivo('');
    setReemplazoId('');
  };

  const enviarSolicitud = () => {
    if (!worker || !formOpenFor || !motivo.trim()) return;
    const reemplazo = tipo === 'reemplazo' ? workersSync.items.find((w) => w.id === reemplazoId) : undefined;
    const nueva: SolicitudCambio = {
      id: newId('sol'),
      workerId: worker.id,
      workerName: worker.fullName,
      iso: formOpenFor,
      tipo,
      motivo: motivo.trim(),
      // Firestore rechaza `undefined` en un campo: solo se incluyen si hay reemplazo.
      ...(reemplazo ? { reemplazoWorkerId: reemplazo.id, reemplazoWorkerName: reemplazo.fullName } : {}),
      estado: 'pendiente',
      creadoEn: new Date().toISOString(),
    };
    solicitudesSync.save(nueva);
    setFormOpenFor(null);
    setTab('solicitudes');
  };

  if (!worker) {
    return (
      <div className="portal-login">
        <div className="portal-login-card">
          <span className="portal-login-icon" aria-hidden="true">👤</span>
          <h1>Mi horario</h1>
          <p>Ingresa el código de 4 dígitos que te dio el administrador.</p>
          <input
            className="portal-code-input"
            inputMode="numeric"
            maxLength={6}
            value={codeInput}
            placeholder="0000"
            onChange={(e) => { setCodeInput(e.target.value.replace(/\D/g, '')); setLoginError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') intentarEntrar(); }}
            autoFocus
          />
          {loginError && <p className="form-error">{loginError}</p>}
          <button type="button" className="primary" onClick={intentarEntrar} disabled={!codeInput}>
            Entrar
          </button>
          <button type="button" className="ghost sm" onClick={onSalir}>Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="portal">
      <header className="portal-header">
        <div>
          <span className="portal-swatch" style={{ background: worker.color }} />
          <div>
            <h1>{worker.fullName}</h1>
            <p>{worker.position} · {worker.area}</p>
          </div>
        </div>
        <button type="button" className="ghost sm" onClick={salirDelPortal}>Salir</button>
      </header>

      <nav className="portal-tabs">
        <button type="button" className={tab === 'horario' ? 'active' : ''} onClick={() => setTab('horario')}>Mi horario</button>
        <button type="button" className={tab === 'solicitudes' ? 'active' : ''} onClick={() => setTab('solicitudes')}>
          Mis solicitudes
          {misSolicitudes.filter((s) => s.estado === 'pendiente').length > 0 && (
            <span className="inbox-badge">{misSolicitudes.filter((s) => s.estado === 'pendiente').length}</span>
          )}
        </button>
      </nav>

      {tab === 'horario' && (
        <section className="portal-week">
          <div className="portal-week-nav">
            <button type="button" className="ghost sm" onClick={() => setAnchor((d) => addDays(d, -7))}>‹ Semana anterior</button>
            <button type="button" className="ghost sm" onClick={() => setAnchor(new Date())}>Hoy</button>
            <button type="button" className="ghost sm" onClick={() => setAnchor((d) => addDays(d, 7))}>Semana siguiente ›</button>
          </div>

          <ul className="portal-day-list">
            {days.map((d) => {
              const iso = toISO(d);
              const turno = misTurnos.find((s) => s.date === iso);
              const isMotivo = turno?.shiftTypeId.startsWith(MOTIVO_PREFIX);
              const motivoName = isMotivo ? turno?.shiftTypeId.slice(MOTIVO_PREFIX.length) : null;
              const mins = turno && !isMotivo ? minutesBetween(turno.start, turno.end) - turno.breakMinutes : 0;
              return (
                <li key={iso} className="portal-day-row">
                  <div className="portal-day-label">
                    <strong>{dayName(d)}</strong>
                    <span>{fmtLong(d)}</span>
                  </div>
                  {turno ? (
                    isMotivo ? (
                      <span
                        className={'portal-day-chip' + (motivoName === 'Día libre' ? ' portal-day-chip--dialibre' : '')}
                        style={{ ['--chip' as string]: motivoColor(motivoName ?? '') }}
                      >
                        {motivoName === 'Día libre' ? 'DÍA LIBRE' : motivoName}
                      </span>
                    ) : (
                      <span className="portal-day-chip portal-day-chip--turno">
                        {turno.start}–{turno.end} · {fmtHours(mins)}
                      </span>
                    )
                  ) : (
                    <span className="portal-day-chip portal-day-chip--vacio">Sin turno asignado</span>
                  )}
                  <button type="button" className="ghost sm" onClick={() => abrirFormulario(iso)}>Pedir cambio</button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tab === 'solicitudes' && (
        <section className="portal-solicitudes">
          <div className="portal-feriado">
            <h3>Mi feriado legal</h3>
            <FeriadoResumen info={calcularFeriado(worker, shiftsSync.items, solicitudesSync.items)} />
          </div>

          <NewRequestForm
            worker={worker}
            shifts={shiftsSync.items}
            solicitudes={solicitudesSync.items}
            onCrear={(sol) => solicitudesSync.save(sol)}
          />

          {misSolicitudes.length === 0 && (
            <p className="empty-state">Todavía no has hecho ninguna solicitud. Elige una arriba, o ve a "Mi horario" y toca "Pedir cambio" en el día que necesites.</p>
          )}
          <ul className="inbox-list">
            {misSolicitudes.map((s) => (
              <li key={s.id} className={'inbox-item inbox-item--' + s.estado}>
                <div className="inbox-item-head">
                  <div>
                    <strong>{TIPO_LABEL[s.tipo] ?? s.tipo}</strong>
                    {fechasTexto(s) && <span className="inbox-item-tipo">{fechasTexto(s)}</span>}
                  </div>
                  <span className={'inbox-pill inbox-pill--' + s.estado}>
                    {s.estado === 'pendiente' ? 'Pendiente' : s.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}
                  </span>
                </div>
                {s.motivo && <p className="inbox-item-motivo">"{s.motivo}"</p>}
                {s.adjunto && <p className="inbox-item-meta">PDF adjunto: {s.adjunto.nombre}</p>}
                {s.respuestaAdmin && <p className="inbox-item-respuesta">Respuesta: "{s.respuestaAdmin}"</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {formOpenFor && (
        <div className="modal-scrim" onClick={() => setFormOpenFor(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Pedir cambio — {fmtLong(new Date(formOpenFor + 'T00:00:00'))}</h3>
              <button type="button" className="modal-close" onClick={() => setFormOpenFor(null)}>×</button>
            </div>
            <div className="modal-body">
              <form className="form" onSubmit={(e) => { e.preventDefault(); enviarSolicitud(); }}>
                <label className="form-field">
                  <span>¿Qué necesitas?</span>
                  <select value={tipo} onChange={(e) => setTipo(e.target.value as SolicitudTipo)}>
                    {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>

                {tipo === 'reemplazo' && (
                  <label className="form-field">
                    <span>¿Con quién?</span>
                    <select value={reemplazoId} onChange={(e) => setReemplazoId(e.target.value)}>
                      <option value="">Elige un compañero</option>
                      {workersSync.items.filter((w) => w.id !== worker.id).map((w) => (
                        <option key={w.id} value={w.id}>{w.fullName}</option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="form-field">
                  <span>Motivo *</span>
                  <input
                    value={motivo} onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej: hora médica, trámite personal…" autoFocus
                  />
                </label>

                <div className="form-actions">
                  <div className="form-actions-right">
                    <button type="button" className="ghost" onClick={() => setFormOpenFor(null)}>Cancelar</button>
                    <button type="submit" className="primary" disabled={!motivo.trim()}>Enviar solicitud</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
