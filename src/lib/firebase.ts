// Conexión a Firebase — proyecto "control-turnos" (Firestore + Auth anónima).
// Las claves de una app web de Firebase no son secretas: sirven para identificar
// el proyecto, no para autenticarse. El acceso real lo controlan las reglas de
// seguridad de Firestore (ver firestore.rules) y el inicio de sesión anónimo.
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAjuWCyb1fZpYQ5P4MRHToHc5HUtK0fPp4',
  authDomain: 'control-turnos-6b394.firebaseapp.com',
  projectId: 'control-turnos-6b394',
  storageBucket: 'control-turnos-6b394.firebasestorage.app',
  messagingSenderId: '642728424499',
  appId: '1:642728424499:web:b880ed282d1c72b673df46',
};

export const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let signInPromise: Promise<void> | null = null;

/** Asegura que haya una sesión anónima activa antes de leer o escribir en Firestore. */
export function ensureSignedIn(): Promise<void> {
  if (auth.currentUser) return Promise.resolve();
  if (!signInPromise) {
    signInPromise = signInAnonymously(auth)
      .then(() => undefined)
      .catch((err) => {
        signInPromise = null;
        throw err;
      });
  }
  return signInPromise;
}
