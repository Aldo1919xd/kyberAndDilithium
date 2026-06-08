import { motion } from "framer-motion";
import { KeyRound, Loader2, MailOpen, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { EncabezadoSeccion } from "@/components/EncabezadoSeccion";
import { TarjetaCertificado } from "@/components/TarjetaCertificado";
import { ContenedorVacio } from "@/components/ContenedorVacio";
import { HuellaCriptografica } from "@/components/HuellaCriptografica";
import { EvidenciaOperacionCriptografica } from "@/components/EvidenciaOperacionCriptografica";
import { acortarHex } from "@/lib/ayudantes";
import type { DatosCriptograficos, ElementoBandeja, CertificadoRecibido } from "@/types";

export function PanelEstudiante(props: {
  operacionPendiente: string;
  estudiantes: string[];
  estudianteActual: string;
  onCambiarEstudianteActual: (valor: string) => void;
  onRecargarBandeja: () => void;
  bandeja: ElementoBandeja[];
  onRecibirCertificado: (item: ElementoBandeja) => void;
  ultimoCertificadoRecibido: CertificadoRecibido | null;
  evidenciaKyber: DatosCriptograficos | null;
  evidenciaVerificacion: DatosCriptograficos | null;
}) {
  return (
    <div className="vista-estudiante">
      <div className="grupo-seccion">
        <Card>
          <CardHeader>
            <EncabezadoSeccion icono={UserRound} titulo="Identidad del estudiante" descripcion="Selecciona la llave privada Kyber que intentara descifrar la bandeja." />
          </CardHeader>
          <CardContent className="fila-flexible">
            <Select value={props.estudianteActual} onChange={(evento) => props.onCambiarEstudianteActual(evento.target.value)}>
              <option value="">Selecciona identidad</option>
              {props.estudiantes.map((estudiante) => (
                <option key={estudiante} value={estudiante}>
                  {estudiante}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={props.onRecargarBandeja} disabled={!props.estudianteActual || props.operacionPendiente === "refresh-inbox"}>
              {props.operacionPendiente === "refresh-inbox" ? <Loader2 className="icono-girando" /> : <RefreshCw className="icono-pequeno" />}
              Recargar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="fila-flexible-entre">
              <EncabezadoSeccion icono={MailOpen} titulo="Bandeja cifrada" descripcion="Cada elemento incluye encapsulado Kyber, datos cifrados y firma Dilithium2." />
              {props.estudianteActual ? <Badge variant="outline">{props.bandeja.length} en bandeja</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="lista-bandeja">
            {!props.estudianteActual ? <ContenedorVacio texto="Selecciona un estudiante para abrir su bandeja." /> : null}
            {props.estudianteActual && props.bandeja.length === 0 ? (
              <ContenedorVacio texto={`No hay certificados entregados para ${props.estudianteActual}. Emite y entrega uno desde Director.`} />
            ) : null}
            {props.bandeja.map((item) => (
              <motion.div layout key={item.id} className="elemento-bandeja">
                <div>
                  <p className="texto-medio">{item.certificado.curso}</p>
                  <p className="texto-apagado">
                    Nota {item.certificado.nota} · {item.certificado.fecha}
                  </p>
                </div>
                <Button variant="outline" onClick={() => props.onRecibirCertificado(item)} disabled={props.operacionPendiente === `open-${item.id}`}>
                  {props.operacionPendiente === `open-${item.id}` ? <Loader2 className="icono-girando" /> : <KeyRound className="icono-pequeno" />}
                  Abrir
                </Button>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <EncabezadoSeccion icono={ShieldCheck} titulo="Certificado recibido" descripcion="El resultado solo es confiable si el descifrado y la firma coinciden." />
        </CardHeader>
        <CardContent>
          <TarjetaCertificado cert={props.ultimoCertificadoRecibido?.certificado} piePagina="Descifrado con Kyber y verificado con Dilithium2" valido={props.ultimoCertificadoRecibido?.valido} />
          {props.ultimoCertificadoRecibido?.firma ? <HuellaCriptografica etiqueta="Firma Dilithium2" valor={acortarHex(props.ultimoCertificadoRecibido.firma, 52)} /> : null}
          {props.evidenciaKyber ? <div className="espaciado-evidencia"><EvidenciaOperacionCriptografica datos={props.evidenciaKyber} /></div> : null}
          {props.evidenciaVerificacion ? <div className="espaciado-evidencia"><EvidenciaOperacionCriptografica datos={props.evidenciaVerificacion} /></div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
