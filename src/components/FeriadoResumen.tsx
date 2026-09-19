import type { FeriadoInfo } from '../lib/vacations';
import { fmtLong } from '../lib/dates';

interface Props {
  info: FeriadoInfo;
  /** Días hábiles de la solicitud que se está armando o evaluando: muestra cuántos quedarían. */
  usando?: number;
}

export function FeriadoResumen({ info, usando }: Props) {
  const quedarian = usando != null ? info.disponibles - usando : null;
  const negativo = (n: number) => (n < 0 ? ' feriado-stat--neg' : '');

  return (
    <div className="feriado">
      <div className="feriado-stats">
        <div className="feriado-stat">
          <strong>{info.anual}</strong>
          <span>Feriado legal</span>
        </div>
        <div className="feriado-stat">
          <strong>{info.tomados}</strong>
          <span>Tomados</span>
        </div>
        {info.reservados > 0 && (
          <div className="feriado-stat">
            <strong>{info.reservados}</strong>
            <span>Pendientes</span>
          </div>
        )}
        <div className={'feriado-stat feriado-stat--main' + negativo(info.disponibles)}>
          <strong>{info.disponibles}</strong>
          <span>Disponibles</span>
        </div>
        {quedarian != null && (
          <div className={'feriado-stat feriado-stat--result' + negativo(quedarian)}>
            <strong>{quedarian}</strong>
            <span>Quedarían</span>
          </div>
        )}
      </div>
      <p className="feriado-note">
        {info.base} días hábiles al año (Art. 67 Código del Trabajo)
        {info.progresivos > 0 ? ` + ${info.progresivos} por antigüedad (Art. 68)` : ''}
        {' · '}Período: {fmtLong(info.periodoDesde)} al {fmtLong(info.periodoHasta)}
      </p>
    </div>
  );
}
