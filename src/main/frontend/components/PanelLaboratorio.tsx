import { AnimatePresence } from "framer-motion";
import { AlertTriangle, FileCheck, KeyRound, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { BotonLaboratorio } from "@/components/BotonLaboratorio";
import { PlantillaLaboratorio } from "@/components/PlantillaLaboratorio";
import { PasoLaboratorio } from "@/components/PasoLaboratorio";
import { PanelAnimado } from "@/components/PanelAnimado";
import { HuellaCriptografica } from "@/components/HuellaCriptografica";
import { acortarHex } from "@/lib/ayudantes";
import type { IdLaboratorio, EstadoLaboratorio } from "@/types";

export function PanelLaboratorio(props: {
  laboratorioActivo: IdLaboratorio;
  onCambiarLaboratorio: (valor: IdLaboratorio) => void;
  operacionPendiente: string;
  estadoLaboratorio: EstadoLaboratorio;
  onActivarRngDebil: () => void;
  onRecuperarLlavePrivada: () => void;
  onFirmarCertificadoFalso: () => void;
  onEntregarCertificadoFalso: () => void;
  estudiantes: string[];
  victimaSeleccionada: string;
  onCambiarVictima: (valor: string) => void;
  cursoFalso: string;
  onCambiarCursoFalso: (valor: string) => void;
  notaFalsa: number;
  onCambiarNotaFalsa: (valor: number) => void;
}) {
  return (
    <div className="grupo-seccion">
      <div className="pestanias-laboratorio">
        <BotonLaboratorio activo={props.laboratorioActivo === "lab1"} etiqueta="RNG debil" onClick={() => props.onCambiarLaboratorio("lab1")} />
      </div>

      <AnimatePresence mode="wait">
        {props.laboratorioActivo === "lab1" ? (
          <PanelAnimado key="lab1">
            <PlantillaLaboratorio
              titulo="RNG debil"
              descripcion="Una semilla fija permite regenerar llaves privadas y producir firmas aparentemente autenticas."
              leccion="La resistencia post-cuantica no compensa una fuente de entropia predecible."
            >
              <PasoLaboratorio numero="1" titulo="Reinicializa la universidad con semilla 12345">
                <Button variant={props.estadoLaboratorio.rngDebilActivo ? "secondary" : "destructive"} onClick={props.onActivarRngDebil} disabled={props.operacionPendiente === "lab1-activate"}>
                  {props.operacionPendiente === "lab1-activate" ? <Loader2 className="icono-girando" /> : <AlertTriangle className="icono-pequeno" />}
                  {props.estadoLaboratorio.rngDebilActivo ? "RNG debil activo" : "Activar RNG debil"}
                </Button>
              </PasoLaboratorio>
              <PasoLaboratorio numero="2" titulo="Regenera la clave privada">
                <Button variant="outline" onClick={props.onRecuperarLlavePrivada} disabled={!props.estadoLaboratorio.rngDebilActivo || props.operacionPendiente === "lab1-extract"}>
                  {props.operacionPendiente === "lab1-extract" ? <Loader2 className="icono-girando" /> : <KeyRound className="icono-pequeno" />}
                  Extraer clave
                </Button>
                <HuellaCriptografica etiqueta="Clave privada regenerada" valor={acortarHex(props.estadoLaboratorio.llavePrivadaRecuperada, 64)} tono="peligro" />
                <HuellaCriptografica etiqueta="Clave publica correspondiente" valor={acortarHex(props.estadoLaboratorio.llavePublicaRecuperada, 64)} />
              </PasoLaboratorio>
              <PasoLaboratorio numero="3" titulo="Falsifica un certificado contra una victima real">
                <div className="fila-flexible">
                  <Select value={props.victimaSeleccionada} onChange={(evento) => props.onCambiarVictima(evento.target.value)}>
                    <option value="">Selecciona victima</option>
                    {props.estudiantes.map((estudiante) => (
                      <option key={estudiante} value={estudiante}>{estudiante}</option>
                    ))}
                  </Select>
                  <Input placeholder="Curso falso" value={props.cursoFalso} onChange={(evento) => props.onCambiarCursoFalso(evento.target.value)} />
                  <Input type="number" min={0} max={100} value={props.notaFalsa} onChange={(evento) => props.onCambiarNotaFalsa(Number(evento.target.value))} className="w-24 shrink-0" />
                </div>
                <div className="fila-flexible">
                  <Button variant="outline" onClick={props.onFirmarCertificadoFalso} disabled={!props.estadoLaboratorio.llavePrivadaRecuperada || !props.victimaSeleccionada || props.operacionPendiente === "lab1-forge"}>
                    {props.operacionPendiente === "lab1-forge" ? <Loader2 className="icono-girando" /> : <FileCheck className="icono-pequeno" />}
                    Firmar falso
                  </Button>
                  <Button variant="destructive" onClick={props.onEntregarCertificadoFalso} disabled={!props.estadoLaboratorio.firmaFalsificada || props.operacionPendiente === "lab1-deliver-forged"}>
                    {props.operacionPendiente === "lab1-deliver-forged" ? <Loader2 className="icono-girando" /> : <Send className="icono-pequeno" />}
                    Entregar a bandeja
                  </Button>
                </div>
                <HuellaCriptografica etiqueta="Firma resultante" valor={acortarHex(props.estadoLaboratorio.firmaFalsificada, 64)} tono="peligro" />
                {props.estadoLaboratorio.entregaFalsaExitosa ? (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 mt-2">
                    Certificado falso entregado a {props.victimaSeleccionada}. Cambia a la vista Estudiante para abrirlo.
                  </div>
                ) : null}
              </PasoLaboratorio>
            </PlantillaLaboratorio>
          </PanelAnimado>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
