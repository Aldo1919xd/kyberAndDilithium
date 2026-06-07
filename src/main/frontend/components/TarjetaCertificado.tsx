import { motion } from "framer-motion";
import { Check, AlertTriangle } from "lucide-react";
import { formatearFecha } from "@/lib/ayudantes";
import type { Certificado } from "@/types";

export function TarjetaCertificado({
  cert,
  piePagina,
  valido,
  accion,
}: {
  cert?: Certificado;
  piePagina: string;
  valido?: boolean;
  accion?: React.ReactNode;
}) {
  if (!cert) {
    return <div className="vista-previa-vacia">Aun no hay certificado seleccionado.</div>;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22 }}
      className="certificate"
    >
      <div className="encabezado-certificado">
        <div>
          <p className="organizacion-cert">PQC UNIVERSITY</p>
          <h3 className="titulo-cert">Certificado academico</h3>
        </div>
        <div className="logo-cert">PQC</div>
      </div>
      <div className="cuerpo-cert">
        <p className="etiqueta-cert">Certifica que</p>
        <p className="estudiante-cert">{cert.estudiante}</p>
        <p className="etiqueta-curso-cert">completo satisfactoriamente</p>
        <p className="curso-cert">{cert.curso}</p>
        <p className="nota-cert">Nota {cert.nota}/100</p>
      </div>
      <div className="pie-cert">
        <div>
          <p className="fecha-cert">{formatearFecha(cert.fecha)}</p>
          <p className="etiqueta-pie-cert">{piePagina}</p>
        </div>
        {valido === undefined ? null : (
          <span className="validez-cert">
            {valido ? <Check className="icono-pequeno" /> : <AlertTriangle className="icono-pequeno" />}
            {valido ? "Firma valida" : "Firma invalida"}
          </span>
        )}
      </div>
      {accion ? <div className="accion-cert">{accion}</div> : null}
    </motion.div>
  );
}
