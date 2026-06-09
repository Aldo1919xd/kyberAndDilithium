import { FormEvent } from "react";
import { FileCheck, GraduationCap, Loader2, Plus, Send, ShieldCheck, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EncabezadoSeccion } from "@/components/EncabezadoSeccion";
import { TarjetaCertificado } from "@/components/TarjetaCertificado";
import { TablaHistorial } from "@/components/TablaHistorial";
import { EvidenciaOperacionCriptografica } from "@/components/EvidenciaOperacionCriptografica";
import type { Certificado, CertificadoFirmado, DatosCriptograficos } from "@/types";

export function PanelDirector(props: {
  operacionPendiente: string;
  estudiantes: string[];
  nombreNuevoEstudiante: string;
  onCambiarNombreNuevoEstudiante: (valor: string) => void;
  onCrearEstudiante: (evento: FormEvent) => void;
  formularioCertificado: Certificado;
  onCambiarFormularioCertificado: (valor: Certificado | ((actual: Certificado) => Certificado)) => void;
  onFirmarCertificado: (evento: FormEvent) => void;
  ultimoCertificadoFirmado: CertificadoFirmado | null;
  onEntregarUltimoCertificado: () => void;
  onEntregarCertificado: (item: CertificadoFirmado) => void;
  historial: CertificadoFirmado[];
  evidenciaDilithium: DatosCriptograficos | null;
  evidenciaKyber: DatosCriptograficos | null;
}) {
  return (
    <div className="vista-director">
      <div className="grupo-seccion">
        <Card>
          <CardHeader>
            <EncabezadoSeccion icono={GraduationCap} titulo="Preparar estudiante" descripcion="Registra al estudiante con su llave publica Kyber generada en el navegador." />
          </CardHeader>
          <CardContent>
            <form className="fila-flexible" onSubmit={props.onCrearEstudiante}>
              <Input placeholder="Nombre del estudiante" value={props.nombreNuevoEstudiante} onChange={(evento) => props.onCambiarNombreNuevoEstudiante(evento.target.value)} />
              <Button type="submit" disabled={props.operacionPendiente === "create-student"}>
                {props.operacionPendiente === "create-student" ? <Loader2 className="icono-girando" /> : <Plus className="icono-pequeno" />}
                Crear
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <EncabezadoSeccion icono={FileCheck} titulo="Emitir certificado" descripcion="El director firma los datos canonicos con la clave Dilithium3 de la universidad." />
          </CardHeader>
          <CardContent>
            <form className="grupo-formulario" onSubmit={props.onFirmarCertificado}>
              <Select value={props.formularioCertificado.estudiante} onChange={(evento) => props.onCambiarFormularioCertificado((actual) => ({ ...actual, estudiante: evento.target.value }))}>
                <option value="">Selecciona estudiante</option>
                {props.estudiantes.map((estudiante) => (
                  <option key={estudiante} value={estudiante}>
                    {estudiante}
                  </option>
                ))}
              </Select>
              <Input
                placeholder="Curso o materia"
                value={props.formularioCertificado.curso}
                onChange={(evento) => props.onCambiarFormularioCertificado((actual) => ({ ...actual, curso: evento.target.value }))}
                required
              />
              <div className="fila-formulario">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={props.formularioCertificado.nota}
                  onChange={(evento) => props.onCambiarFormularioCertificado((actual) => ({ ...actual, nota: Number(evento.target.value) }))}
                  required
                />
                <Input
                  type="date"
                  value={props.formularioCertificado.fecha}
                  onChange={(evento) => props.onCambiarFormularioCertificado((actual) => ({ ...actual, fecha: evento.target.value }))}
                  required
                />
              </div>
              <Button className="ancho-completo" type="submit" disabled={props.operacionPendiente === "issue" || props.estudiantes.length === 0}>
                {props.operacionPendiente === "issue" ? <Loader2 className="icono-girando" /> : <ShieldCheck className="icono-pequeno" />}
                Firmar certificado
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grupo-seccion">
        <Card>
          <CardHeader>
            <EncabezadoSeccion icono={BookOpen} titulo="Certificado activo" descripcion="Despues de firmar, entregalo para cifrarlo con la clave Kyber del estudiante." />
          </CardHeader>
          <CardContent>
            <TarjetaCertificado
              cert={props.ultimoCertificadoFirmado?.certificado}
              piePagina={props.ultimoCertificadoFirmado?.estado === "entregado" ? "Entregado y cifrado con Kyber" : "Firmado con Dilithium3"}
              valido
              accion={
                props.ultimoCertificadoFirmado && props.ultimoCertificadoFirmado.estado !== "entregado" ? (
                  <Button className="ancho-completo" onClick={props.onEntregarUltimoCertificado} disabled={props.ultimoCertificadoFirmado !== null && props.operacionPendiente === `deliver-${props.ultimoCertificadoFirmado.id}`}>
                    {props.ultimoCertificadoFirmado !== null && props.operacionPendiente === `deliver-${props.ultimoCertificadoFirmado.id}` ? <Loader2 className="icono-girando" /> : <Send className="icono-pequeno" />}
                    Entregar a estudiante
                  </Button>
                ) : null
              }
            />
            {props.evidenciaDilithium ? <div className="espaciado-evidencia"><EvidenciaOperacionCriptografica datos={props.evidenciaDilithium} /></div> : null}
            {props.evidenciaKyber ? <div className="espaciado-evidencia"><EvidenciaOperacionCriptografica datos={props.evidenciaKyber} /></div> : null}
          </CardContent>
        </Card>

        <TablaHistorial operacionPendiente={props.operacionPendiente} historial={props.historial} onEntregarCertificado={props.onEntregarCertificado} />
      </div>
    </div>
  );
}
