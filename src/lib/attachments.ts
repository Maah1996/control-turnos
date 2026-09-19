// Adjuntos (PDF de una licencia médica). Firebase Storage no está disponible en el plan
// gratuito (Spark) de este proyecto, así que el archivo se guarda dentro de Firestore, en
// base64 y partido en trozos: un documento de Firestore no puede pasar de 1 MB.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, ensureSignedIn } from './firebase';

export const MAX_ADJUNTO_BYTES = 3 * 1024 * 1024;
const TROZO_CHARS = 400_000;

export interface AdjuntoMeta {
  nombre: string;
  tamano: number;
  trozos: number;
}

function leerBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}

export async function guardarAdjunto(solicitudId: string, file: File): Promise<AdjuntoMeta> {
  await ensureSignedIn();
  const base64 = await leerBase64(file);
  const trozos = Math.max(1, Math.ceil(base64.length / TROZO_CHARS));
  await Promise.all(Array.from({ length: trozos }, (_, i) => setDoc(
    doc(db, 'adjuntos', `${solicitudId}_${i}`),
    { id: `${solicitudId}_${i}`, solicitudId, indice: i, data: base64.slice(i * TROZO_CHARS, (i + 1) * TROZO_CHARS) },
  )));
  return { nombre: file.name, tamano: file.size, trozos };
}

/** Reúne los trozos y abre el PDF en una pestaña nueva. */
export async function abrirAdjunto(solicitudId: string, meta: AdjuntoMeta): Promise<void> {
  // La pestaña se abre antes del `await` para que el navegador no la bloquee como ventana emergente.
  const pestana = window.open('', '_blank');
  try {
    await ensureSignedIn();
    const partes = await Promise.all(Array.from({ length: meta.trozos }, (_, i) => getDoc(doc(db, 'adjuntos', `${solicitudId}_${i}`))));
    if (partes.some((p) => !p.exists())) throw new Error('El archivo está incompleto.');
    const binario = atob(partes.map((p) => (p.data() as { data: string }).data).join(''));
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    if (pestana) pestana.location.href = url;
    else window.location.href = url;
  } catch (err) {
    pestana?.close();
    throw err;
  }
}
