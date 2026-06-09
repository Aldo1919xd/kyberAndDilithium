import { AnimatePresence } from "framer-motion";
import { AlertTriangle, FileCheck, KeyRound, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  onToggleEntropiaPredecible: (activo: boolean) => void;
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
        <BotonLaboratorio activo={props.laboratorioActivo === "lab1"} etiqueta="Entropia en Dilithium" onClick={() => props.onCambiarLaboratorio("lab1")} />
      </div>

      <AnimatePresence mode="wait">
        {props.laboratorioActivo === "lab1" ? (
          <PanelAnimado key="lab1">
            <PlantillaLaboratorio
              titulo="Ataque por entropia predecible"
              descripcion="Dilithium2 genera sus claves a partir de una fuente de aleatoriedad. Si esa fuente es predecible (semilla fija), la misma clave privada se regenera siempre, permitiendo falsificar firmas."
              leccion="La resistencia post-cuantica no compensa una fuente de entropia predecible."
            >
              <PasoLaboratorio numero="1" titulo="Activa la entropia predecible">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={props.estadoLaboratorio.entropiaPredecible}
                    onCheckedChange={props.onToggleEntropiaPredecible}
                    disabled={props.operacionPendiente === "lab1-toggle"}
                  />
                  <span className="text-sm text-foreground">
                    {props.estadoLaboratorio.entropiaPredecible
                      ? "Entropia predecible activa (seed 12345)"
                      : "Usar entropia predecible (seed 12345)"}
                  </span>
                  {props.operacionPendiente === "lab1-toggle" ? <Loader2 className="icono-girando text-muted-foreground" /> : null}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Al activarlo, la universidad se reinicializa con semilla fija 12345.
                  Cualquier clave Dilithium generada sera identica y recuperable.
                </p>
              </PasoLaboratorio>
              <PasoLaboratorio numero="2" titulo="Regenera la clave privada">
                <Button variant="outline" onClick={props.onRecuperarLlavePrivada} disabled={!props.estadoLaboratorio.entropiaPredecible || props.operacionPendiente === "lab1-extract"}>
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
                  <div className="rounded-lg border p-3 text-sm mt-2" style={{ borderColor: "color-mix(in srgb, var(--evidence-error), transparent 70%)", background: "color-mix(in srgb, var(--evidence-error), transparent 90%)", color: "var(--evidence-error)" }}>
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
