import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { FileCheck, Fingerprint, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ContadorMetrica } from "@/components/ContadorMetrica";
import { BotonNavegacion } from "@/components/BotonNavegacion";
import { PanelAnimado } from "@/components/PanelAnimado";
import { PanelDirector } from "@/components/PanelDirector";
import { PanelEstudiante } from "@/components/PanelEstudiante";
import { PanelLaboratorio } from "@/components/PanelLaboratorio";
import { PanelInfoPQC } from "@/components/PanelInfoPQC";
import { peticionGet, peticionPost } from "@/api";
import { hoy } from "@/lib/ayudantes";
import type { Certificado, CertificadoFirmado, DatosCriptograficos, ElementoBandeja, CertificadoRecibido, EstadoLaboratorio, IdLaboratorio, RespuestaApi, RespuestaEmision, RespuestaEntrega, RespuestaRecepcion, Vista } from "@/types";
import "./styles.css";

export default function App() {
  const [vista, setVista] = useState<Vista>("director");
  const [laboratorioActivo, setLaboratorioActivo] = useState<IdLaboratorio>("lab1");
  const [estudiantes, setEstudiantes] = useState<string[]>([]);
  const [historial, setHistorial] = useState<CertificadoFirmado[]>([]);
  const [bandeja, setBandeja] = useState<ElementoBandeja[]>([]);
  const [estudianteActual, setEstudianteActual] = useState("");
  const [ultimoCertificadoFirmado, setUltimoCertificadoFirmado] = useState<CertificadoFirmado | null>(null);
  const [ultimoCertificadoRecibido, setUltimoCertificadoRecibido] = useState<CertificadoRecibido | null>(null);
  const [operacionPendiente, setOperacionPendiente] = useState("");
  const [nombreNuevoEstudiante, setNombreNuevoEstudiante] = useState("");
  const [formularioCertificado, setFormularioCertificado] = useState<Certificado>({ estudiante: "", curso: "", nota: 100, fecha: hoy() });
  const [estadoLaboratorio, setEstadoLaboratorio] = useState<EstadoLaboratorio>({ rngDebilActivo: false });
  const [evidenciaDilithium, setEvidenciaDilithium] = useState<DatosCriptograficos | null>(null);
  const [evidenciaKyber, setEvidenciaKyber] = useState<DatosCriptograficos | null>(null);
  const [evidenciaVerificacion, setEvidenciaVerificacion] = useState<DatosCriptograficos | null>(null);

  const estadisticas = useMemo(
    () => ({
      emitidos: historial.length,
      entregados: historial.filter((item) => item.estado === "entregado").length,
      bandeja: bandeja.length,
    }),
    [historial, bandeja],
  );

  async function refrescarEstudiantes() {
    const datos = await peticionGet<{ estudiantes: string[] }>("/estudiantes");
    const nombres = [...(datos.estudiantes || [])].sort((a, b) => a.localeCompare(b));
    setEstudiantes(nombres);
    if (!formularioCertificado.estudiante && nombres[0]) setFormularioCertificado((actual) => ({ ...actual, estudiante: nombres[0] }));
  }

  async function refrescarHistorial() {
    const datos = await peticionGet<{ certificados: CertificadoFirmado[] }>("/certificados");
    setHistorial(datos.certificados || []);
  }

  async function refrescarBandeja(estudiante = estudianteActual) {
    if (!estudiante) {
      setBandeja([]);
      return 0;
    }
    const datos = await peticionGet<{ bandeja: ElementoBandeja[] }>(`/certificados/bandeja/${encodeURIComponent(estudiante)}`);
    const items = datos.bandeja || [];
    setBandeja(items);
    return items.length;
  }

  async function refrescarEstadoLaboratorio() {
    const datos = await peticionGet<{ rngDebilActivo: boolean }>("/laboratorios/1/estado");
    setEstadoLaboratorio((actual) => ({ ...actual, rngDebilActivo: datos.rngDebilActivo }));
  }

  useEffect(() => {
    Promise.all([refrescarEstudiantes(), refrescarHistorial(), refrescarEstadoLaboratorio()]).catch((error) => {
      toast.error("No se pudo cargar el estado inicial", { description: error.message });
    });
  }, []);

  async function crearEstudiante(evento: FormEvent) {
    evento.preventDefault();
    const nombre = nombreNuevoEstudiante.trim();
    if (!nombre) return;
    setOperacionPendiente("create-student");
    try {
      const datos = await peticionPost<RespuestaApi>("/estudiante/crear", { nombre });
      if (!datos.exito) throw new Error(datos.error || "No se pudo crear el estudiante");
      toast.success("Estudiante preparado", { description: `${nombre} ya tiene llaves Kyber.` });
      setNombreNuevoEstudiante("");
      await refrescarEstudiantes();
      setEstudianteActual(nombre);
      setUltimoCertificadoRecibido(null);
      await refrescarBandeja(nombre);
    } catch (error) {
      toast.error("Error creando estudiante", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setOperacionPendiente("");
    }
  }

  async function firmarCertificado(evento: FormEvent) {
    evento.preventDefault();
    if (!formularioCertificado.estudiante) {
      toast.error("Selecciona un estudiante");
      return;
    }
    setOperacionPendiente("issue");
    try {
      const datos = await peticionPost<RespuestaEmision>("/certificado/emitir", formularioCertificado);
      setUltimoCertificadoFirmado(datos.certificado!);
      setEvidenciaDilithium({
        algoritmo: "Dilithium2",
        operacion: "FIRMAR",
        tipoLlave: "PRIVADA de Universidad",
        llaveHex: datos.llavePublicaUniversidad || "",
        entrada: `Datos del certificado (${formularioCertificado.estudiante}, ${formularioCertificado.curso})`,
        salida: `Firma: ${datos.certificado!.firma}`,
        exito: true,
      });
      setEvidenciaKyber(null);
      toast.success("Certificado firmado", { description: "Dilithium2 genero una firma valida." });
      await refrescarHistorial();
    } catch (error) {
      toast.error("No se pudo emitir", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setOperacionPendiente("");
    }
  }

  async function entregarCertificado(item: CertificadoFirmado) {
    const destinatario = item.certificado.estudiante;
    setOperacionPendiente(`deliver-${item.id}`);
    try {
      const datos = await peticionPost<RespuestaEntrega>("/certificados/entregar", {
        idCertificado: item.id,
        nombreEstudiante: destinatario,
      });
      if (!datos.exito) throw new Error(datos.error || "No se pudo entregar");
      setEvidenciaKyber({
        algoritmo: "Kyber",
        operacion: "CIFRAR (ML-KEM + AES-GCM)",
        tipoLlave: "PÚBLICA de Estudiante",
        llaveHex: datos.llavePublicaEstudiante || "",
        entrada: "Certificado firmado por Universidad",
        salida: `Texto cifrado: ${datos.entrega?.textoCifrado || ""} · IV: ${datos.entrega?.iv || ""}`,
        exito: true,
      });
      toast.success("Certificado entregado", { description: "El contenido viajo cifrado con Kyber." });
      if (ultimoCertificadoFirmado?.id === item.id) setUltimoCertificadoFirmado({ ...item, estado: "entregado" });
      setEstudianteActual(destinatario);
      setUltimoCertificadoRecibido(null);
      await refrescarHistorial();
      const cantidad = await refrescarBandeja(destinatario);
      toast.message(`Bandeja de ${destinatario}`, { description: `${cantidad} certificado${cantidad === 1 ? "" : "s"} entregado${cantidad === 1 ? "" : "s"}.` });
    } catch (error) {
      toast.error("Entrega fallida", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setOperacionPendiente("");
    }
  }

  async function entregarUltimoCertificado() {
    if (!ultimoCertificadoFirmado) return;
    await entregarCertificado(ultimoCertificadoFirmado);
  }

  async function recargarBandejaEstudiante() {
    if (!estudianteActual) return;
    setOperacionPendiente("refresh-inbox");
    try {
      await refrescarHistorial();
      const cantidad = await refrescarBandeja(estudianteActual);
      toast.success("Bandeja recargada", {
        description: `${estudianteActual} tiene ${cantidad} certificado${cantidad === 1 ? "" : "s"} entregado${cantidad === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      toast.error("No se pudo recargar bandeja", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setOperacionPendiente("");
    }
  }

  async function recibirCertificado(item: ElementoBandeja) {
    if (!estudianteActual) return;
    setOperacionPendiente(`open-${item.id}`);
    try {
      const datos = await peticionPost<RespuestaRecepcion>("/certificados/recibir", {
        idCertificado: item.id,
        nombreEstudiante: estudianteActual,
      });
      if (!datos.exito) throw new Error(datos.error || "No se pudo abrir");
      setUltimoCertificadoRecibido({ certificado: datos.certificado!, firma: datos.firma, valido: datos.valido! });
      setEvidenciaKyber({
        algoritmo: "Kyber",
        operacion: "DESCIFRAR (ML-KEM + AES-GCM)",
        tipoLlave: "PRIVADA de Estudiante",
        llaveHex: "",
        entrada: `Texto cifrado + IV de ${estudianteActual}`,
        salida: `Certificado descifrado correctamente`,
        exito: true,
      });
      setEvidenciaVerificacion({
        algoritmo: "Dilithium2",
        operacion: "VERIFICAR",
        tipoLlave: "PÚBLICA de Universidad",
        llaveHex: datos.llavePublicaUniversidad || "",
        entrada: `Firma + datos del certificado`,
        salida: datos.valido ? "Firma válida — contenido íntegro ✅" : "Firma inválida — contenido alterado ❌",
        exito: datos.valido!,
      });
      toast.success("Certificado descifrado", { description: datos.valido ? "Firma Dilithium2 verificada." : "La firma no coincide." });
    } catch (error) {
      toast.error("No se pudo abrir", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setOperacionPendiente("");
    }
  }

  async function activarRngDebil() {
    setOperacionPendiente("lab1-activate");
    try {
      await peticionPost<{ exito: boolean }>("/laboratorios/1/activar-rng-debil", {});
      setEstadoLaboratorio((actual) => ({ ...actual, rngDebilActivo: true }));
      toast.warning("RNG debil activado", { description: "La universidad fue reinicializada con semilla fija 12345." });
    } catch (error) {
      toast.error("No se pudo activar", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setOperacionPendiente("");
    }
  }

  async function recuperarLlavePrivada() {
    setOperacionPendiente("lab1-extract");
    try {
      const datos = await peticionPost<{ llavePrivada: string; llavePublica: string; semilla: number }>("/laboratorios/1/recuperar-llave-privada", {});
      setEstadoLaboratorio((actual) => ({ ...actual, llavePrivadaRecuperada: datos.llavePrivada, llavePublicaRecuperada: datos.llavePublica }));
      toast.warning("Clave privada regenerada", { description: `Semilla usada: ${datos.semilla}.` });
    } catch (error) {
      toast.error("Extraccion fallida", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setOperacionPendiente("");
    }
  }

  async function firmarCertificadoFalso() {
    setOperacionPendiente("lab1-forge");
    const cert = { estudiante: "Atacante", curso: "Certificado fabricado", nota: 100, fecha: hoy() };
    try {
      const datos = await peticionPost<{ valido: boolean; firma: string }>("/laboratorios/1/firmar-certificado-falso", cert);
      setEstadoLaboratorio((actual) => ({ ...actual, firmaFalsificada: datos.firma }));
      toast.warning(datos.valido ? "Certificado falso aceptado" : "La falsificacion fallo", {
        description: "La firma se genero con la clave regenerada.",
      });
    } catch (error) {
      toast.error("Firma falsa fallida", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setOperacionPendiente("");
    }
  }

  return (
    <main className="aplicacion">
      <div className="contenedor-app">
        <header className="encabezado-app">
          <div>
            <div className="grupo-insignias">
              <Badge variant="outline">PQC University</Badge>
              <Badge variant="secondary">Dilithium2</Badge>
              <Badge variant="secondary">Kyber</Badge>
            </div>
            <h1 className="titulo-app">Laboratorio  de certificados PQC.</h1>
            <p className="subtitulo-app">
              Emite, entrega, verifica y ataca certificados academicos para entender que protege la criptografia y que queda expuesto cuando falla la confianza.
            </p>
          </div>
          <Card className="tarjeta-estadisticas">
            <CardContent className="cuadricula-estadisticas">
              <ContadorMetrica etiqueta="Emitidos" valor={estadisticas.emitidos} />
              <ContadorMetrica etiqueta="Entregados" valor={estadisticas.entregados} />
              <ContadorMetrica etiqueta="Bandeja" valor={estadisticas.bandeja} />
            </CardContent>
          </Card>
        </header>

        <nav className="cuadricula-navegacion">
          <BotonNavegacion activo={vista === "director"} icono={FileCheck} etiqueta="Director" onClick={() => setVista("director")} />
          <BotonNavegacion
            activo={vista === "estudiante"}
            icono={UserRound}
            etiqueta="Estudiante"
            onClick={() => {
              setVista("estudiante");
              refrescarBandeja().catch(() => undefined);
            }}
          />
          <BotonNavegacion activo={vista === "laboratorios"} icono={Fingerprint} etiqueta="Laboratorios" onClick={() => setVista("laboratorios")} />
        </nav>

        <AnimatePresence mode="wait">
          {vista === "director" ? (
            <PanelAnimado key="director">
              <PanelDirector
                operacionPendiente={operacionPendiente}
                estudiantes={estudiantes}
                nombreNuevoEstudiante={nombreNuevoEstudiante}
                onCambiarNombreNuevoEstudiante={setNombreNuevoEstudiante}
                onCrearEstudiante={crearEstudiante}
                formularioCertificado={formularioCertificado}
                onCambiarFormularioCertificado={setFormularioCertificado}
                onFirmarCertificado={firmarCertificado}
                ultimoCertificadoFirmado={ultimoCertificadoFirmado}
                onEntregarUltimoCertificado={entregarUltimoCertificado}
                onEntregarCertificado={entregarCertificado}
                historial={historial}
                evidenciaDilithium={evidenciaDilithium}
                evidenciaKyber={evidenciaKyber}
              />
            </PanelAnimado>
          ) : null}
          {vista === "estudiante" ? (
            <PanelAnimado key="estudiante">
              <PanelEstudiante
                operacionPendiente={operacionPendiente}
                estudiantes={estudiantes}
                estudianteActual={estudianteActual}
                onCambiarEstudianteActual={(nombre) => {
                  setEstudianteActual(nombre);
                  setUltimoCertificadoRecibido(null);
                  refrescarBandeja(nombre).catch((error) => toast.error("No se pudo cargar bandeja", { description: error.message }));
                }}
                onRecargarBandeja={recargarBandejaEstudiante}
                bandeja={bandeja}
                onRecibirCertificado={recibirCertificado}
                ultimoCertificadoRecibido={ultimoCertificadoRecibido}
                evidenciaKyber={evidenciaKyber}
                evidenciaVerificacion={evidenciaVerificacion}
              />
            </PanelAnimado>
          ) : null}
          {vista === "laboratorios" ? (
            <PanelAnimado key="laboratorios">
              <PanelLaboratorio
                laboratorioActivo={laboratorioActivo}
                onCambiarLaboratorio={setLaboratorioActivo}
                operacionPendiente={operacionPendiente}
                estadoLaboratorio={estadoLaboratorio}
                onActivarRngDebil={activarRngDebil}
                onRecuperarLlavePrivada={recuperarLlavePrivada}
                onFirmarCertificadoFalso={firmarCertificadoFalso}
              />
            </PanelAnimado>
          ) : null}
        </AnimatePresence>

        <PanelInfoPQC />
      </div>
    </main>
  );
}
