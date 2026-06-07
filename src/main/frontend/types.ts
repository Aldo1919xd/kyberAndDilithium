export type Vista = "director" | "estudiante" | "laboratorios";
export type IdLaboratorio = "lab1";

export type Certificado = {
  estudiante: string;
  curso: string;
  nota: number;
  fecha: string;
};

export type CertificadoFirmado = {
  id: string;
  certificado: Certificado;
  firma: string;
  estado: "emitido" | "entregado" | string;
  estudiante?: string;
};

export type ElementoBandeja = CertificadoFirmado & {
  textoCifrado?: string;
  iv?: string;
  datosCifrados?: string;
};

export type CertificadoRecibido = {
  certificado: Certificado;
  firma?: string;
  valido: boolean;
};

export type RespuestaApi = {
  exito: boolean;
  error?: string;
};

export type EstadoLaboratorio = {
  rngDebilActivo: boolean;
  llavePrivadaRecuperada?: string;
  llavePublicaRecuperada?: string;
  firmaFalsificada?: string;
};
