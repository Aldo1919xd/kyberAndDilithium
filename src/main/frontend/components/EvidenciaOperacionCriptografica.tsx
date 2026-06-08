import { motion } from "framer-motion";
import { Check, X, KeyRound, Fingerprint } from "lucide-react";
import type { DatosCriptograficos } from "@/types";
import { acortarHex } from "@/lib/ayudantes";
import { cn } from "@/lib/utils";

function iconoAlgoritmo(algoritmo: string) {
  if (algoritmo.toLowerCase().includes("dilithium")) return <Fingerprint className="icono-pequeno" />;
  if (algoritmo.toLowerCase().includes("kyber")) return <KeyRound className="icono-pequeno" />;
  return <Fingerprint className="icono-pequeno" />;
}

export function EvidenciaOperacionCriptografica({ datos }: { datos: DatosCriptograficos }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("evidencia-crypto", datos.exito ? "evidencia-exito" : "evidencia-fallo")}
    >
      <div className="encabezado-evidencia">
        <div className="grupo-algoritmo">
          {iconoAlgoritmo(datos.algoritmo)}
          <span className="texto-algoritmo">{datos.algoritmo}</span>
          <span className="separador-algoritmo">·</span>
          <span className="texto-operacion">{datos.operacion}</span>
        </div>
        <span className="icono-resultado">
          {datos.exito ? <Check className="icono-pequeno" /> : <X className="icono-pequeno" />}
        </span>
      </div>
      <div className="linea-evidencia">
        <span className="etiqueta-evidencia">Llave:</span>
        <span className="valor-tipo-llave">{datos.tipoLlave}</span>
        <code className="codigo-llave">{acortarHex(datos.llaveHex, 32)}</code>
      </div>
      <div className="linea-evidencia">
        <span className="etiqueta-evidencia">Entrada:</span>
        <code className="codigo-evidencia">{datos.entrada}</code>
      </div>
      <div className="linea-evidencia">
        <span className="etiqueta-evidencia">Salida:</span>
        <code className="codigo-evidencia">{datos.salida}</code>
      </div>
    </motion.div>
  );
}
