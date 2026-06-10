export type Vista = "director" | "estudiante";

export type Certificado = {
  estudiante: string;
  curso: string;
  nota: number;
  fecha: string;
};

export type DatosCriptograficos = {
  algoritmo: string;
  operacion: string;
  tipoLlave: string;
  llaveHex: string;
  entrada: string;
  salida: string;
  exito: boolean;
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

export type RespuestaEmision = RespuestaApi & {
  certificado?: CertificadoFirmado;
  llavePublicaUniversidad?: string;
};

export type RespuestaEntrega = RespuestaApi & {
  entrega?: ElementoBandeja;
  llavePublicaEstudiante?: string;
  llavePublicaUniversidad?: string;
};

export type RespuestaApi = {
  exito: boolean;
  error?: string;
};


