interface Props {
  onElegir: (rol: 'admin' | 'trabajador') => void;
}

export function RoleGate({ onElegir }: Props) {
  return (
    <div className="rolegate">
      <div className="rolegate-card">
        <h1>Control de turnos</h1>
        <p>¿Cómo quieres entrar?</p>
        <div className="rolegate-options">
          <button type="button" className="rolegate-btn" onClick={() => onElegir('admin')}>
            <span className="rolegate-icon" aria-hidden="true">🗂️</span>
            <span>Soy administrador</span>
            <span className="rolegate-sub">Gestiono la planilla completa</span>
          </button>
          <button type="button" className="rolegate-btn" onClick={() => onElegir('trabajador')}>
            <span className="rolegate-icon" aria-hidden="true">👤</span>
            <span>Soy trabajador</span>
            <span className="rolegate-sub">Veo mi horario y pido cambios</span>
          </button>
        </div>
      </div>
    </div>
  );
}
