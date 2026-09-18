// Hooks genéricos para mantener una colección o un documento de Firestore
// sincronizado con el estado de React, en tiempo real (onSnapshot) — así el
// administrador y cada trabajador ven siempre los mismos datos, en vez del
// localStorage por dispositivo que usaba la versión anterior.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection, deleteDoc, doc, onSnapshot, setDoc,
} from 'firebase/firestore';
import { db, ensureSignedIn } from './firebase';

/**
 * Sincroniza una colección completa como un array de objetos con `id`.
 * Si la colección está vacía la primera vez, la siembra con `seed`
 * (los datos de ejemplo / iniciales).
 */
export function useFirestoreCollection<T extends { id: string }>(path: string, seed: T[]) {
  const [items, setItems] = useState<T[]>(seed);
  const [ready, setReady] = useState(false);
  const seeded = useRef(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    ensureSignedIn()
      .then(() => {
        if (cancelled) return;
        unsub = onSnapshot(collection(db, path), (snap) => {
          if (snap.empty && !seeded.current && !ready) {
            seeded.current = true;
            seed.forEach((item) => { void setDoc(doc(db, path, item.id), item); });
            return;
          }
          setItems(snap.docs.map((d) => d.data() as T));
          setReady(true);
        }, () => setReady(true));
      })
      .catch(() => setReady(true));

    return () => { cancelled = true; unsub?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const save = useCallback((item: T) => { void setDoc(doc(db, path, item.id), item); }, [path]);
  const remove = useCallback((id: string) => { void deleteDoc(doc(db, path, id)); }, [path]);

  return { items, save, remove, ready };
}

/** Sincroniza un único documento (por ejemplo, la config compartida: áreas y motivos). */
export function useFirestoreDoc<T extends object>(path: string, seed: T) {
  const [data, setData] = useState<T>(seed);
  const [ready, setReady] = useState(false);
  const seeded = useRef(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    const ref = doc(db, path);

    ensureSignedIn()
      .then(() => {
        if (cancelled) return;
        unsub = onSnapshot(ref, (snap) => {
          if (!snap.exists() && !seeded.current) {
            seeded.current = true;
            void setDoc(ref, seed as Record<string, unknown>);
            return;
          }
          if (snap.exists()) setData(snap.data() as T);
          setReady(true);
        }, () => setReady(true));
      })
      .catch(() => setReady(true));

    return () => { cancelled = true; unsub?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const save = useCallback((next: T) => { void setDoc(doc(db, path), next as Record<string, unknown>); }, [path]);

  return { data, save, ready };
}
