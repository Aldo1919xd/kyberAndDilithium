import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { ml_dsa44 } from "@noble/post-quantum/ml-dsa.js";
import { shake256 } from "@noble/hashes/sha3.js";
import { concatBytes } from "@noble/hashes/utils.js";

const API = "/api";

// ── utilidades hex ──

function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(h: string) {
  const s = h.replace(/\s/g, "");
  const r = new Uint8Array(new ArrayBuffer(s.length / 2));
  for (let i = 0; i < r.length; i++) r[i] = Number.parseInt(s.substring(i * 2, i * 2 + 2), 16);
  return r;
}

function concatenar(...args: Uint8Array[]) {
  const total = args.reduce((s, a) => s + a.length, 0);
  const r = new Uint8Array(new ArrayBuffer(total));
  let off = 0;
  for (const a of args) { r.set(a, off); off += a.length; }
  return r;
}

function jsonSeguro(texto: string) {
  try { return JSON.parse(texto); }
  catch { return { error: texto.slice(0, 160) }; }
}

// ── handshake + cifrado ──

class SesionPQC {
  private sessionId: string | null = null;
  private sessionKey: CryptoKey | null = null;

  get estaLista() { return this.sessionId !== null && this.sessionKey !== null; }
  get idSesion() { return this.sessionId; }

  async iniciarHandshake() {
    const init: { handshake_id: string; pk_sig: string; pk_kem: string; firma: string; server_nonce: string }
      = await post("/handshake/init", {});

    const pkSig = hexToBytes(init.pk_sig);
    const pkKem = hexToBytes(init.pk_kem);
    const firma = hexToBytes(init.firma);
    const serverNonce = hexToBytes(init.server_nonce);
    const handshakeId = init.handshake_id;

    const msg = concatenar(serverNonce, pkKem, new TextEncoder().encode(handshakeId));
    const tr = shake256(pkSig, { dkLen: 64 });
    const mu = shake256(concatBytes(tr, msg), { dkLen: 64 });
    if (!ml_dsa44.internal.verify(firma, mu, pkSig, { externalMu: true })) {
      throw new Error("Firma del servidor invalida - posible ataque MITM");
    }

    const { cipherText, sharedSecret } = ml_kem768.encapsulate(pkKem);
    const clientNonce = crypto.getRandomValues(new Uint8Array(16));
    const sessionKeyRaw = await hkdfDerive(sharedSecret, concatenar(serverNonce, clientNonce));

    this.sessionKey = await crypto.subtle.importKey("raw", sessionKeyRaw as unknown as ArrayBuffer, "AES-GCM", false, ["encrypt", "decrypt"]);

    const fin: { sessionId: string } = await post("/handshake/finalizar", {
      handshake_id: handshakeId,
      ct: bytesToHex(cipherText),
      client_nonce: bytesToHex(clientNonce),
    });
    if (!fin.sessionId) throw new Error("Handshake fallo");
    this.sessionId = fin.sessionId;
  }

  async cifrarPeticion(body: unknown) {
    if (!this.sessionKey) throw new Error("Sesion no establecida");
    const json = new TextEncoder().encode(JSON.stringify(body));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cifrado = await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, this.sessionKey, json);
    return { iv: bytesToHex(iv), datos_cifrados: bytesToHex(new Uint8Array(cifrado)) };
  }

  async descifrarRespuesta(ivHex: string, datosHex: string) {
    if (!this.sessionKey) throw new Error("Sesion no establecida");
    const desc = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: hexToBytes(ivHex), tagLength: 128 },
      this.sessionKey,
      hexToBytes(datosHex),
    );
    return JSON.parse(new TextDecoder().decode(desc));
  }
}

async function hkdfDerive(sharedSecret: Uint8Array, salt: Uint8Array) {
  const km = await crypto.subtle.importKey("raw", sharedSecret as unknown as ArrayBuffer, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", salt: salt as unknown as ArrayBuffer, info: new TextEncoder().encode("PQC-Handshake-v1"), hash: "SHA-256" },
    km, 256,
  );
  return new Uint8Array(bits);
}

async function post<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const r = await fetch(API + ruta, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo),
  });
  const t = await r.text();
  const c = t ? jsonSeguro(t) : {};
  if (!r.ok) throw new Error(c.error || `HTTP ${r.status}`);
  return c;
}

// ── singleton handshake lazy ──

const sesion = new SesionPQC();
let handshakeHecho = false;
let handshakePendiente: Promise<void> | null = null;

async function asegurarHandshake() {
  if (handshakeHecho) return;
  if (!handshakePendiente) handshakePendiente = sesion.iniciarHandshake().then(() => { handshakeHecho = true; });
  return handshakePendiente;
}

// ── API pública ──

export async function peticionGet<T>(ruta: string): Promise<T> {
  await asegurarHandshake();
  const r = await fetch(API + ruta, { headers: { "X-Session-ID": sesion.idSesion ?? "" } });
  const t = await r.text();
  const c = t ? jsonSeguro(t) : {};
  if (!r.ok) throw new Error(c.error || `HTTP ${r.status}`);
  return "iv" in c && "datos_cifrados" in c ? (await sesion.descifrarRespuesta(c.iv, c.datos_cifrados)) as T : c;
}

export async function peticionPost<T>(ruta: string, cuerpo: unknown): Promise<T> {
  await asegurarHandshake();
  const cifrado = await sesion.cifrarPeticion(cuerpo);
  const r = await fetch(API + ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-ID": sesion.idSesion ?? "" },
    body: JSON.stringify(cifrado),
  });
  const t = await r.text();
  const c = t ? jsonSeguro(t) : {};
  if (!r.ok) throw new Error(c.error || `HTTP ${r.status}`);
  return "iv" in c && "datos_cifrados" in c ? (await sesion.descifrarRespuesta(c.iv, c.datos_cifrados)) as T : c;
}
