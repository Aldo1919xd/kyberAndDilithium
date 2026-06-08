import { SesionPQC } from "@/lib/sesionPQC";

const API = "/api";
const sesion = new SesionPQC();
let handshakeHecho = false;
let handshakePendiente: Promise<void> | null = null;

function jsonSeguro(texto: string) {
  try {
    return JSON.parse(texto);
  } catch {
    return { error: texto.slice(0, 160) };
  }
}

async function asegurarHandshake(): Promise<void> {
  if (handshakeHecho) return;
  if (!handshakePendiente) {
    handshakePendiente = sesion.iniciarHandshake().then(() => {
      handshakeHecho = true;
    });
  }
  return handshakePendiente;
}

export async function peticionGet<T>(ruta: string): Promise<T> {
  await asegurarHandshake();
  const respuesta = await fetch(API + ruta, {
    headers: { "X-Session-ID": sesion.idSesion ?? "" },
  });
  const texto = await respuesta.text();
  const contenido = texto ? jsonSeguro(texto) : {};
  if (!respuesta.ok) throw new Error(contenido.error || `HTTP ${respuesta.status}`);
  return "iv" in contenido && "datos_cifrados" in contenido
    ? (await sesion.descifrarRespuesta(contenido.iv, contenido.datos_cifrados)) as T
    : contenido;
}

export async function peticionPost<T>(ruta: string, cuerpo: unknown): Promise<T> {
  await asegurarHandshake();
  const cifrado = await sesion.cifrarPeticion(cuerpo);
  const respuesta = await fetch(API + ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-ID": sesion.idSesion ?? "" },
    body: JSON.stringify(cifrado),
  });
  const texto = await respuesta.text();
  const contenido = texto ? jsonSeguro(texto) : {};
  if (!respuesta.ok) throw new Error(contenido.error || `HTTP ${respuesta.status}`);
  return "iv" in contenido && "datos_cifrados" in contenido
    ? (await sesion.descifrarRespuesta(contenido.iv, contenido.datos_cifrados)) as T
    : contenido;
}
