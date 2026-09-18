import { useState } from 'react';
import './App.css';
import AdminApp from './AdminApp';
import { RoleGate } from './components/RoleGate';
import { WorkerPortal } from './components/WorkerPortal';

type Rol = 'admin' | 'trabajador' | null;

export default function App() {
  const [rol, setRol] = useState<Rol>(() => {
    try {
      const guardado = sessionStorage.getItem('turnos_rol');
      if (guardado === 'admin' || guardado === 'trabajador') return guardado;
    } catch {
      // sessionStorage no disponible: seguimos sin rol guardado
    }
    return null;
  });

  const elegirRol = (r: 'admin' | 'trabajador') => {
    setRol(r);
    try { sessionStorage.setItem('turnos_rol', r); } catch { /* no-op */ }
  };

  const volverAlInicio = () => {
    setRol(null);
    try { sessionStorage.removeItem('turnos_rol'); } catch { /* no-op */ }
  };

  if (rol === 'admin') return <AdminApp onSalir={volverAlInicio} />;
  if (rol === 'trabajador') return <WorkerPortal onSalir={volverAlInicio} />;
  return <RoleGate onElegir={elegirRol} />;
}
