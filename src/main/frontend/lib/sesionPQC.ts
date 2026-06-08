import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { ml_dsa44 } from "@noble/post-quantum/ml-dsa.js";

const API = "/api";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  const limpio = hex.replace(/\s/g, "");
  const bytes = new Uint8Array(new ArrayBuffer(limpio.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(limpio.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function concatenar(...args: Uint8Array[]) {
  const total = args.reduce((sum, a) => sum + a.length, 0);
  const resultado = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const a of args) {
    resultado.set(a, offset);
    offset += a.length;
  }
  return resultado;
}

async function peticionPost<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const respuesta = await fetch(API + ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const texto = await respuesta.text();
  const contenido = texto ? JSON.parse(texto) : {};
  if (!respuesta.ok) throw new Error(contenido.error || `HTTP ${respuesta.status}`);
  return contenido;
}

async function hkdfDerive(sharedSecret: Uint8Array, salt: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey("raw", sharedSecret as unknown as ArrayBuffer, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      salt: salt as unknown as ArrayBuffer,
      info: new TextEncoder().encode("PQC-Handshake-v1"),
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return new Uint8Array(bits);
}

export class SesionPQC {
  private sessionId: string | null = null;
  private sessionKey: CryptoKey | null = null;

  get estaLista(): boolean {
    return this.sessionId !== null && this.sessionKey !== null;
  }

  async iniciarHandshake(): Promise<void> {
    const respInit: { handshake_id: string; pk_sig: string; pk_kem: string; firma: string; server_nonce: string }
      = await peticionPost("/handshake/init", {});

    const pkSig = hexToBytes(respInit.pk_sig);
    const pkKem = hexToBytes(respInit.pk_kem);
    const firma = hexToBytes(respInit.firma);
    const serverNonce = hexToBytes(respInit.server_nonce);
    const handshakeId = respInit.handshake_id;

    const datosFirmados = concatenar(serverNonce, pkKem, new TextEncoder().encode(handshakeId));
    const verificacionOk = ml_dsa44.verify(firma, datosFirmados, pkSig);
    if (!verificacionOk) {
      throw new Error("Firma del servidor invalida - posible ataque MITM");
    }

    const { cipherText, sharedSecret } = ml_kem768.encapsulate(pkKem);

    const clientNonce = crypto.getRandomValues(new Uint8Array(16));
    const salt = concatenar(serverNonce, clientNonce);
    const sessionKeyRaw = await hkdfDerive(sharedSecret, salt);

    this.sessionKey = await crypto.subtle.importKey("raw", sessionKeyRaw as unknown as ArrayBuffer, "AES-GCM", false, ["encrypt", "decrypt"]);

    const respFinal: { sessionId: string }
      = await peticionPost("/handshake/finalizar", {
        handshake_id: handshakeId,
        ct: bytesToHex(cipherText),
        client_nonce: bytesToHex(clientNonce),
      });

    if (!respFinal.sessionId) throw new Error("Handshake fallo en el servidor");
    this.sessionId = respFinal.sessionId;
  }

  async cifrarPeticion(body: unknown): Promise<{ iv: string; datos_cifrados: string }> {
    if (!this.sessionId || !this.sessionKey) throw new Error("Sesion no establecida");
    const json = JSON.stringify(body);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cifrado = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, tagLength: 128 },
      this.sessionKey,
      new TextEncoder().encode(json),
    );
    return { iv: bytesToHex(iv), datos_cifrados: bytesToHex(new Uint8Array(cifrado)) };
  }

  async descifrarRespuesta(ivHex: string, datosHex: string): Promise<unknown> {
    if (!this.sessionKey) throw new Error("Sesion no establecida");
    const iv = hexToBytes(ivHex);
    const datos = hexToBytes(datosHex);
    const descifrado = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, tagLength: 128 },
      this.sessionKey,
      datos,
    );
    return JSON.parse(new TextDecoder().decode(descifrado));
  }

  get idSesion(): string | null {
    return this.sessionId;
  }
}
