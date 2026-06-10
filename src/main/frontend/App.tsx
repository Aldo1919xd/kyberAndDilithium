import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { FileCheck, Fingerprint, Moon, Sun, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ContadorMetrica } from "@/components/ContadorMetrica";
import { BotonNavegacion } from "@/components/BotonNavegacion";
import { PanelAnimado } from "@/components/PanelAnimado";
import { PanelDirector } from "@/components/PanelDirector";
import { PanelEstudiante } from "@/components/PanelEstudiante";
import { PanelLaboratorio } from "@/components/PanelLaboratorio";
import { PanelInfoPQC } from "@/components/PanelInfoPQC";
import { peticionGet, peticionPost, generarParKyber, guardarLlavePrivada, obtenerLlavePrivada, descifrarConKyber, verificarFirmaDilithium, bytesToHex, hexToBytes } from "@/api";
import { hoy } from "@/lib/ayudantes";
import type { Certificado, CertificadoFirmado, DatosCriptograficos, ElementoBandeja, CertificadoRecibido, EstadoLaboratorio, IdLaboratorio, RespuestaApi, RespuestaEmision, RespuestaEntrega, Vista } from "@/types";
import "./styles.css";

export default function App() {
  const [tema, setTema] = useState<"dark" | "light">("dark");
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
  const [estadoLaboratorio, setEstadoLaboratorio] = useState<EstadoLaboratorio>({ entropiaPredecible: false });
  const [victimaSeleccionada, setVictimaSeleccionada] = useState("");
  const [cursoFalso, setCursoFalso] = useState("Certificado falsificado");
  const [notaFalsa, setNotaFalsa] = useState(100);
  const [evidenciaDilithium, setEvidenciaDilithium] = useState<DatosCriptograficos | null>(null);
  const [evidenciaKyber, setEvidenciaKyber] = useState<DatosCriptograficos | null>(null);
  const [evidenciaVerificacion, setEvidenciaVerificacion] = useState<DatosCriptograficos | null>(null);
  const [llavePublicaUniversidad, setLlavePublicaUniversidad] = useState("");

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
    const datos = await peticionGet<{ entropiaPredecible: boolean }>("/laboratorios/1/estado");
    setEstadoLaboratorio((actual) => ({ ...actual, entropiaPredecible: datos.entropiaPredecible }));
  }

  useEffect(() => {
    document.documentElement.classList.toggle("light", tema === "light");
    queueMicrotask(() => {
      const meta = document.querySelector("meta[name=theme-color]");
      if (meta) meta.setAttribute("content", getComputedStyle(document.documentElement).backgroundColor);
    });
  }, [tema]);

  useEffect(() => {
    Promise.all([
      refrescarEstudiantes(),
      refrescarHistorial(),
      refrescarEstadoLaboratorio(),
      peticionGet<{ llavePublica: string }>("/universidad/llave-publica").then((d) => setLlavePublicaUniversidad(d.llavePublica)),
    ]).catch((error) => {
      toast.error("No se pudo cargar el estado inicial", { description: error instanceof Error ? error.message : "Error desconocido" });
    });
  }, []);

  async function crearEstudiante(evento: FormEvent) {
    evento.preventDefault();
    const nombre = nombreNuevoEstudiante.trim();
    if (!nombre) return;
    setOperacionPendiente("create-student");
    try {
      const par = generarParKyber();
      guardarLlavePrivada(nombre, par.secretKey);
      const llavePublicaHex = bytesToHex(par.publicKey);
      const datos = await peticionPost<{ exito: boolean; llavePublicaUniversidad: string }>("/estudiante/crear", { nombre, llavePublica: llavePublicaHex });
      if (!datos.exito) throw new Error("No se pudo crear el estudiante");
      if (datos.llavePublicaUniversidad) setLlavePublicaUniversidad(datos.llavePublicaUniversidad);
      toast.success("Estudiante preparado", { description: `${nombre} genero su par Kyber en el navegador.` });
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
      if (datos.llavePublicaUniversidad) setLlavePublicaUniversidad(datos.llavePublicaUniversidad);
      setUltimoCertificadoFirmado(datos.certificado!);
      setEvidenciaDilithium({
        algoritmo: "Dilithium3",
        operacion: "FIRMAR",
        tipoLlave: "PRIVADA de Universidad",
        llaveHex: datos.llavePublicaUniversidad || "",
        entrada: `Datos del certificado (${formularioCertificado.estudiante}, ${formularioCertificado.curso})`,
        salida: `Firma: ${datos.certificado!.firma}`,
        exito: true,
      });
      setEvidenciaKyber(null);
      toast.success("Certificado firmado", { description: "Dilithium3 genero una firma valida." });
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
      const pubKey = datos.llavePublicaUniversidad || llavePublicaUniversidad;
      if (pubKey) setLlavePublicaUniversidad(pubKey);
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
      const llavePrivada = obtenerLlavePrivada(estudianteActual);
      if (!llavePrivada) throw new Error("Llave privada no disponible en este navegador");

      const textoCifrado = hexToBytes(item.textoCifrado || "");
      const iv = hexToBytes(item.iv || "");
      const datosCifrados = hexToBytes(item.datosCifrados || "");
      const firma = hexToBytes(item.firma || "");

      const certCanonico = await descifrarConKyber(textoCifrado, iv, datosCifrados, llavePrivada);

      const llavePub = hexToBytes(llavePublicaUniversidad);
      const valido = verificarFirmaDilithium(certCanonico, firma, llavePub);

      setUltimoCertificadoRecibido({ certificado: item.certificado, firma: item.firma, valido });
      setEvidenciaKyber({
        algoritmo: "Kyber",
        operacion: "DESCIFRAR (ML-KEM + AES-GCM)",
        tipoLlave: "PRIVADA de Estudiante (local)",
        llaveHex: bytesToHex(llavePrivada),
        entrada: `Texto cifrado + IV de ${estudianteActual}`,
        salida: `Certificado descifrado localmente en el navegador`,
        exito: true,
      });
      setEvidenciaVerificacion({
        algoritmo: "Dilithium3",
        operacion: "VERIFICAR",
        tipoLlave: "PÚBLICA de Universidad",
        llaveHex: llavePublicaUniversidad,
        entrada: `Firma + datos del certificado`,
        salida: valido ? "Firma válida — contenido íntegro ✅" : "Firma inválida — contenido alterado ❌",
        exito: valido,
      });
      toast.success("Certificado descifrado localmente", { description: valido ? "Firma Dilithium3 verificada." : "La firma no coincide." });
    } catch (error) {
      toast.error("No se pudo abrir", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setOperacionPendiente("");
    }
  }

  async function onToggleEntropiaPredecible(activo: boolean) {
    setOperacionPendiente("lab1-toggle");
    try {
      await peticionPost<{ exito: boolean }>("/laboratorios/1/activar-rng-debil", { activo });
      setEstadoLaboratorio((actual) => ({ ...actual, entropiaPredecible: activo }));
      if (activo) {
        toast.warning("Entropia predecible activada", { description: "Universidad reinicializada con semilla fija 12345." });
      } else {
        toast.info("Entropia predecible desactivada", { description: "La universidad usa entropia real nuevamente." });
      }
    } catch (error) {
      toast.error("Error al cambiar entropia", { description: error instanceof Error ? error.message : "Error desconocido" });
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
    if (!victimaSeleccionada) {
      toast.error("Selecciona una victima");
      return;
    }
    setOperacionPendiente("lab1-forge");
    const cert = { estudiante: victimaSeleccionada, curso: cursoFalso, nota: notaFalsa, fecha: hoy() };
    try {
      const datos = await peticionPost<{ valido: boolean; firma: string }>("/laboratorios/1/firmar-certificado-falso", cert);
      setEstadoLaboratorio((actual) => ({ ...actual, firmaFalsificada: datos.firma, entregaFalsaExitosa: false }));
      toast.warning(datos.valido ? "Certificado falso aceptado" : "La falsificacion fallo", {
        description: "La firma se genero con la clave regenerada.",
      });
    } catch (error) {
      toast.error("Firma falsa fallida", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setOperacionPendiente("");
    }
  }

  async function entregarCertificadoFalso() {
    if (!victimaSeleccionada) {
      toast.error("Selecciona una victima");
      return;
    }
    setOperacionPendiente("lab1-deliver-forged");
    const cert = { estudiante: victimaSeleccionada, curso: cursoFalso, nota: notaFalsa, fecha: hoy() };
    try {
      const datos = await peticionPost<{ exito: boolean; valido?: boolean; firma?: string; error?: string }>("/laboratorios/1/entregar-falso", cert);
      if (!datos.exito) throw new Error(datos.error || "No se pudo entregar");
      setEstadoLaboratorio((actual) => ({ ...actual, firmaFalsificada: datos.firma, entregaFalsaExitosa: true }));
      toast.warning("Certificado falso entregado", {
        description: `${victimaSeleccionada} ahora tiene un certificado falsificado en su bandeja.`,
      });
    } catch (error) {
      toast.error("Entrega fallida", { description: error instanceof Error ? error.message : "Error desconocido" });
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
              <Badge variant="secondary">Dilithium3</Badge>
              <Badge variant="secondary">Kyber</Badge>
              <button
                onClick={() => setTema((t) => (t === "dark" ? "light" : "dark"))}
                className="ml-auto rounded-md border border-border bg-secondary p-1.5 text-secondary-foreground transition-colors hover:bg-muted"
                aria-label="Cambiar tema"
              >
                {tema === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
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
                onToggleEntropiaPredecible={onToggleEntropiaPredecible}
                onRecuperarLlavePrivada={recuperarLlavePrivada}
                onFirmarCertificadoFalso={firmarCertificadoFalso}
                onEntregarCertificadoFalso={entregarCertificadoFalso}
                estudiantes={estudiantes}
                victimaSeleccionada={victimaSeleccionada}
                onCambiarVictima={setVictimaSeleccionada}
                cursoFalso={cursoFalso}
                onCambiarCursoFalso={setCursoFalso}
                notaFalsa={notaFalsa}
                onCambiarNotaFalsa={setNotaFalsa}
              />
            </PanelAnimado>
          ) : null}
        </AnimatePresence>

        <PanelInfoPQC />
      </div>
    </main>
  );
}
