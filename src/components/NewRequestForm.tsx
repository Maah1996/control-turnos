import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { SolicitudCambio, Worker } from '../types';
import { businessDaysRange, fmtLong, fromISO, toISO } from '../lib/dates';
import { MAX_ADJUNTO_BYTES, guardarAdjunto } from '../lib/attachments';

type NuevaTipo = '' | 'vacaciones' | 'reunion' | 'licencia' | 'otro';

interface Props {
  worker: Worker;
  onCrear: (solicitud: SolicitudCambio) => void;
}

const OPCIONES: { value: Exclude<NuevaTipo, ''>; label: string }[] = [
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'reunion', label: 'Reunión con el gerente' },
  { value: 'licencia', label: 'Licencia' },
  { value: 'otro', label: 'Otro' },
];

function newId() {
  return `sol-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function NewRequestForm({ worker, onCrear }: Props) {
  const hoy = toISO(new Date());
  const [tipo, setTipo] = useState<NuevaTipo>('');
  const [desde, setDesde] = useState(hoy);
  const [dias, setDias] = useState(1);
  const [fechaReunion, setFechaReunion] = useState(hoy);
  const [hora, setHora] = useState('10:00');
  const [texto, setTexto] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [enviada, setEnviada] = useState(false);

  const conRango = tipo === 'vacaciones' || tipo === 'licencia';
  const fechas = useMemo(
    () => (conRango && desde ? businessDaysRange(fromISO(desde), Math.min(90, Math.max(1, dias))) : []),
    [conRango, desde, dias],
  );
  const hasta = fechas[fechas.length - 1];

  const elegirTipo = (value: NuevaTipo) => {
    setTipo(value);
    setError('');
    setEnviada(false);
    setArchivo(null);
  };

  const elegirArchivo = (file: File | null) => {
    setError('');
    if (!file) { setArchivo(null); return; }
    const esPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!esPdf) { setError('El archivo debe ser un PDF.'); setArchivo(null); return; }
    if (file.size > MAX_ADJUNTO_BYTES) {
      setError(`El PDF pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo es ${MAX_ADJUNTO_BYTES / 1024 / 1024} MB.`);
      setArchivo(null);
      return;
    }
    setArchivo(file);
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!tipo) return;
    if (conRango && (!desde || fechas.length === 0)) { setError('Indica la fecha de inicio y los días.'); return; }
    if (tipo === 'reunion' && (!fechaReunion || !hora)) { setError('Indica la fecha y la hora que te acomodan.'); return; }
    if (tipo === 'otro' && !texto.trim()) { setError('Escribe lo que necesitas.'); return; }

    setEnviando(true);
    setError('');
    try {
      const id = newId();
      const adjunto = tipo === 'licencia' && archivo ? await guardarAdjunto(id, archivo) : undefined;
      const solicitud: SolicitudCambio = {
        id,
        workerId: worker.id,
        workerName: worker.fullName,
        tipo,
        iso: conRango ? toISO(fechas[0]) : tipo === 'reunion' ? fechaReunion : hoy,
        motivo: texto.trim(),
        estado: 'pendiente',
        creadoEn: new Date().toISOString(),
        // Firestore rechaza campos `undefined`: cada opcional solo entra si corresponde.
        ...(conRango ? { dias: fechas.length, hastaIso: toISO(hasta) } : {}),
        ...(tipo === 'reunion' ? { hora } : {}),
        ...(adjunto ? { adjunto } : {}),
      };
      onCrear(solicitud);
      setTipo('');
      setTexto('');
      setArchivo(null);
      setDias(1);
      setEnviada(true);
    } catch {
      setError('No se pudo enviar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="form new-request" onSubmit={enviar}>
      <label className="form-field">
        <span>Nueva solicitud</span>
        <select value={tipo} onChange={(e) => elegirTipo(e.target.value as NuevaTipo)}>
          <option value="">Elige qué necesitas…</option>
          {OPCIONES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>

      {enviada && !tipo && <p className="form-context new-request-ok">Solicitud enviada. La verás abajo con su estado.</p>}

      {conRango && (
        <>
          <div className="form-row">
            <label className="form-field">
              <span>Fecha de inicio</span>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </label>
            <label className="form-field">
              <span>Cantidad de días hábiles</span>
              <input type="number" min={1} max={90} value={dias} onChange={(e) => setDias(Number(e.target.value))} />
            </label>
          </div>
          {hasta && (
            <p className="form-context">
              Terminas el <strong>{fmtLong(hasta)}</strong> ({fechas.length} {fechas.length === 1 ? 'día hábil' : 'días hábiles'};
              sábado y domingo no cuentan).
            </p>
          )}
        </>
      )}

      {tipo === 'reunion' && (
        <div className="form-row">
          <label className="form-field">
            <span>Fecha que te acomoda</span>
            <input type="date" value={fechaReunion} onChange={(e) => setFechaReunion(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Hora</span>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </label>
        </div>
      )}

      {tipo === 'licencia' && (
        <label className="form-field">
          <span>PDF de tu licencia (máx. {MAX_ADJUNTO_BYTES / 1024 / 1024} MB)</span>
          <input type="file" accept="application/pdf,.pdf" onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)} />
          {archivo && <small className="new-request-file">{archivo.name} · {(archivo.size / 1024).toFixed(0)} KB</small>}
        </label>
      )}

      {tipo !== '' && (
        <label className="form-field">
          <span>
            {tipo === 'otro' ? 'Cuéntanos qué necesitas *' : tipo === 'reunion' ? '¿Sobre qué? (opcional)' : 'Comentario (opcional)'}
          </span>
          <textarea rows={tipo === 'otro' ? 4 : 2} value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
      )}

      {error && <p className="form-error">{error}</p>}

      {tipo !== '' && (
        <div className="form-actions">
          <div className="form-actions-right">
            <button type="button" className="ghost" onClick={() => elegirTipo('')}>Cancelar</button>
            <button type="submit" className="primary" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
