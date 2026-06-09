import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";

const API = "/api";

// ── llaves privadas locales (solo en memoria, nunca viajan) ──

const llavesPrivadas = new Map<string, Uint8Array>();

export function generarParKyber() {
  return ml_kem768.keygen();
}

export function guardarLlavePrivada(nombre: string, llave: Uint8Array) {
  llavesPrivadas.set(nombre, llave);
}

export function obtenerLlavePrivada(nombre: string): Uint8Array | undefined {
  return llavesPrivadas.get(nombre);
}

// ── crypto local ──

export async function descifrarConKyber(
  textoCifrado: Uint8Array,
  iv: Uint8Array,
  datosCifrados: Uint8Array,
  llavePrivada: Uint8Array,
): Promise<Uint8Array> {
  const sharedSecret = ml_kem768.decapsulate(textoCifrado, llavePrivada);
  const rawKey = sharedSecret.slice(0).buffer as ArrayBuffer;
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
  const input = datosCifrados.slice(0).buffer as ArrayBuffer;
  const ivBuf = iv.slice(0).buffer as ArrayBuffer;
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuf, tagLength: 128 }, key, input);
  return new Uint8Array(plaintext);
}

export function verificarFirmaDilithium(
  mensaje: Uint8Array,
  firma: Uint8Array,
  llavePublica: Uint8Array,
): boolean {
  return ml_dsa65.verify(firma, mensaje, llavePublica);
}

export function aBytesCanonicos(cert: { estudiante: string; curso: string; nota: number; fecha: string }): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({
    curso: cert.curso,
    estudiante: cert.estudiante,
    fecha: cert.fecha,
    nota: cert.nota,
  }));
}

// ── fetch helpers ──

export async function peticionGet<T>(ruta: string): Promise<T> {
  const r = await fetch(API + ruta);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function peticionPost<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const r = await fetch(API + ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ── helpers hex ──

export function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(h: string): Uint8Array {
  const s = h.replace(/\s/g, "");
  const r = new Uint8Array(new ArrayBuffer(s.length / 2));
  for (let i = 0; i < r.length; i++) r[i] = Number.parseInt(s.substring(i * 2, i * 2 + 2), 16);
  return r;
}
