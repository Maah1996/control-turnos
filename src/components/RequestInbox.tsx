import { useMemo, useState } from 'react';
import type { SolicitudCambio, SolicitudEstado } from '../types';
import { TIPO_LABEL, fechasTexto } from '../lib/solicitudes';
import { abrirAdjunto } from '../lib/attachments';

interface Props {
  solicitudes: SolicitudCambio[];
  onResolver: (id: string, estado: 'aprobada' | 'rechazada', respuestaAdmin?: string) => void;
}

const ESTADO_LABEL: Record<SolicitudEstado, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

export function RequestInbox({ solicitudes, onResolver }: Props) {
  const [filtro, setFiltro] = useState<SolicitudEstado | 'todas'>('pendiente');
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [errorAdjunto, setErrorAdjunto] = useState('');

  const verAdjunto = (s: SolicitudCambio) => {
    if (!s.adjunto) return;
    setErrorAdjunto('');
    abrirAdjunto(s.id, s.adjunto).catch(() => setErrorAdjunto('No se pudo abrir el PDF. Inténtalo de nuevo.'));
  };

  const ordenadas = useMemo(
    () => [...solicitudes].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)),
    [solicitudes],
  );

  const filtradas = filtro === 'todas' ? ordenadas : ordenadas.filter((s) => s.estado === filtro);

  const counts = useMemo(() => ({
    pendiente: solicitudes.filter((s) => s.estado === 'pendiente').length,
    aprobada: solicitudes.filter((s) => s.estado === 'aprobada').length,
    rechazada: solicitudes.filter((s) => s.estado === 'rechazada').length,
  }), [solicitudes]);

  return (
    <div className="inbox">
      <div className="inbox-tabs" role="tablist">
        {(['pendiente', 'aprobada', 'rechazada', 'todas'] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filtro === f}
            className={'inbox-tab' + (filtro === f ? ' active' : '')}
            onClick={() => setFiltro(f)}
          >
            {f === 'todas' ? 'Todas' : ESTADO_LABEL[f]}
            {f !== 'todas' && counts[f] > 0 && <span className="inbox-tab-count">{counts[f]}</span>}
          </button>
        ))}
      </div>

      {filtradas.length === 0 && (
        <p className="empty-state">No hay solicitudes {filtro === 'todas' ? '' : `en estado "${ESTADO_LABEL[filtro as SolicitudEstado].toLowerCase()}"`} por ahora.</p>
      )}

      {errorAdjunto && <p className="form-error">{errorAdjunto}</p>}

      <ul className="inbox-list">
        {filtradas.map((s) => (
          <li key={s.id} className={'inbox-item inbox-item--' + s.estado}>
            <div className="inbox-item-head">
              <div>
                <strong>{s.workerName}</strong>
                <span className="inbox-item-tipo">{TIPO_LABEL[s.tipo] ?? s.tipo}</span>
              </div>
              <span className={'inbox-pill inbox-pill--' + s.estado}>{ESTADO_LABEL[s.estado]}</span>
            </div>
            <p className="inbox-item-meta">
              {fechasTexto(s)}
              {s.tipo === 'reemplazo' && s.reemplazoWorkerName ? ` · con ${s.reemplazoWorkerName}` : ''}
            </p>
            {s.motivo && <p className="inbox-item-motivo">"{s.motivo}"</p>}
            {s.adjunto && (
              <button type="button" className="ghost sm inbox-adjunto" onClick={() => verAdjunto(s)}>
                Ver PDF de la licencia ({s.adjunto.nombre})
              </button>
            )}

            {s.estado === 'pendiente' ? (
              <div className="inbox-item-actions">
                <input
                  placeholder="Respuesta para el trabajador (opcional)"
                  value={respuestas[s.id] ?? ''}
                  onChange={(e) => setRespuestas((prev) => ({ ...prev, [s.id]: e.target.value }))}
                />
                <div className="inbox-item-buttons">
                  <button
                    type="button"
                    className="danger-ghost"
                    onClick={() => onResolver(s.id, 'rechazada', respuestas[s.id])}
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => onResolver(s.id, 'aprobada', respuestas[s.id])}
                  >
                    Aprobar
                  </button>
                </div>
                <p className="inbox-item-hint">
                  {s.tipo === 'vacaciones' || s.tipo === 'licencia'
                    ? `Al aprobar, el calendario se completa solo con "${s.tipo === 'vacaciones' ? 'Vacaciones' : 'Licencia médica'}" en esos días hábiles (reemplaza lo que hubiera).`
                    : 'Aprobar no cambia el calendario solo — recuerda reflejar el cambio en la planilla si corresponde.'}
                </p>
              </div>
            ) : (
              s.respuestaAdmin && <p className="inbox-item-respuesta">Tu respuesta: "{s.respuestaAdmin}"</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
