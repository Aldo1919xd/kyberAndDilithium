import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle,
  BookOpen,
  Check,
  CircleDot,
  FileCheck,
  Fingerprint,
  GraduationCap,
  KeyRound,
  Loader2,
  MailOpen,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Terminal,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const API = "/api";

type View = "director" | "student" | "labs";
type LabId = "lab1" | "lab2" | "lab3";

type Certificate = {
  student: string;
  course: string;
  grade: number;
  date: string;
};

type IssuedCertificate = {
  id: string;
  certificate: Certificate;
  signature: string;
  status: "issued" | "delivered" | string;
  student?: string;
};

type InboxItem = IssuedCertificate & {
  ciphertext?: string;
  iv?: string;
  encryptedData?: string;
};

type ReceivedCertificate = {
  certificate: Certificate;
  signature?: string;
  valid: boolean;
};

type ApiResult = {
  success: boolean;
  error?: string;
};

type LabState = {
  weakRngActive: boolean;
  lab1PrivateKey?: string;
  lab1PublicKey?: string;
  lab1Signature?: string;
  lab2Student: string;
  lab2OriginalKey?: string;
  lab2MalloryKey?: string;
  lab2IssuedCert?: IssuedCertificate;
  lab2Read?: Certificate;
  lab3FakeKey?: string;
  lab3Signature?: string;
  lab3Certificate?: Certificate;
};

const today = () => new Date().toISOString().split("T")[0];

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(API + path);
  const text = await response.text();
  const payload = text ? safeJson(text) : {};
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const payload = text ? safeJson(text) : {};
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 160) };
  }
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function truncateHex(value?: string, visible = 36) {
  if (!value) return "Sin evidencia";
  if (value.length <= visible * 2) return value;
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

function MotionPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-xl font-semibold tracking-normal">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}

function Evidence({ label, value, tone = "neutral" }: { label: string; value?: string; tone?: "neutral" | "danger" }) {
  return (
    <div className={cn("rounded-md border bg-black p-4", tone === "danger" ? "border-white/25" : "border-border")}>
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Terminal className="h-3.5 w-3.5" />
        {label}
      </div>
      <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-5 text-foreground">{value || "Pendiente"}</pre>
    </div>
  );
}

function CertificatePreview({
  cert,
  footer,
  valid,
  action,
}: {
  cert?: Certificate;
  footer: string;
  valid?: boolean;
  action?: React.ReactNode;
}) {
  if (!cert) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Aun no hay certificado seleccionado.
      </div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22 }}
      className="certificate"
    >
      <div className="flex items-center justify-between gap-4 border-b border-black/15 pb-5">
        <div>
          <p className="font-mono text-xs text-black/50">PQC UNIVERSITY</p>
          <h3 className="mt-1 text-2xl font-semibold text-black">Certificado academico</h3>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-black text-sm font-semibold text-black">
          PQC
        </div>
      </div>
      <div className="py-8 text-center">
        <p className="text-sm text-black/55">Certifica que</p>
        <p className="mt-3 text-3xl font-semibold tracking-normal text-black">{cert.student}</p>
        <p className="mt-6 text-sm text-black/55">completo satisfactoriamente</p>
        <p className="mt-2 text-xl font-medium text-black">{cert.course}</p>
        <p className="mt-5 font-mono text-sm text-black/70">Nota {cert.grade}/100</p>
      </div>
      <div className="flex flex-col gap-4 border-t border-black/15 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-black">{formatDate(cert.date)}</p>
          <p className="mt-1 text-xs text-black/50">{footer}</p>
        </div>
        {valid === undefined ? null : (
          <span className="inline-flex items-center gap-2 rounded-md border border-black px-3 py-2 text-xs font-medium text-black">
            {valid ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {valid ? "Firma valida" : "Firma invalida"}
          </span>
        )}
      </div>
      {action ? <div className="mt-5">{action}</div> : null}
    </motion.div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("director");
  const [activeLab, setActiveLab] = useState<LabId>("lab1");
  const [students, setStudents] = useState<string[]>([]);
  const [history, setHistory] = useState<IssuedCertificate[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [currentStudent, setCurrentStudent] = useState("");
  const [lastIssued, setLastIssued] = useState<IssuedCertificate | null>(null);
  const [received, setReceived] = useState<ReceivedCertificate | null>(null);
  const [busy, setBusy] = useState("");
  const [studentName, setStudentName] = useState("");
  const [issueForm, setIssueForm] = useState<Certificate>({ student: "", course: "", grade: 100, date: today() });
  const [labState, setLabState] = useState<LabState>({ weakRngActive: false, lab2Student: "" });

  const stats = useMemo(
    () => ({
      issued: history.length,
      delivered: history.filter((item) => item.status === "delivered").length,
      inbox: inbox.length,
    }),
    [history, inbox],
  );

  async function refreshStudents() {
    const data = await apiGet<{ students: string[] }>("/students");
    const names = [...(data.students || [])].sort((a, b) => a.localeCompare(b));
    setStudents(names);
    if (!issueForm.student && names[0]) setIssueForm((current) => ({ ...current, student: names[0] }));
  }

  async function refreshHistory() {
    const data = await apiGet<{ certificates: IssuedCertificate[] }>("/certificates");
    setHistory(data.certificates || []);
  }

  async function refreshInbox(student = currentStudent) {
    if (!student) {
      setInbox([]);
      return 0;
    }
    const data = await apiGet<{ inbox: InboxItem[] }>(`/certificates/inbox/${encodeURIComponent(student)}`);
    const items = data.inbox || [];
    setInbox(items);
    return items.length;
  }

  async function refreshLabStatus() {
    const data = await apiGet<{ weakRngActive: boolean }>("/labs/1/status");
    setLabState((current) => ({ ...current, weakRngActive: data.weakRngActive }));
  }

  useEffect(() => {
    Promise.all([refreshStudents(), refreshHistory(), refreshLabStatus()]).catch((error) => {
      toast.error("No se pudo cargar el estado inicial", { description: error.message });
    });
  }, []);

  async function createStudent(event: FormEvent) {
    event.preventDefault();
    const name = studentName.trim();
    if (!name) return;
    setBusy("create-student");
    try {
      const data = await apiPost<ApiResult>("/student/create", { name });
      if (!data.success) throw new Error(data.error || "No se pudo crear el estudiante");
      toast.success("Estudiante preparado", { description: `${name} ya tiene llaves Kyber.` });
      setStudentName("");
      await refreshStudents();
      setCurrentStudent(name);
      setReceived(null);
      await refreshInbox(name);
    } catch (error) {
      toast.error("Error creando estudiante", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy("");
    }
  }

  async function issueCertificate(event: FormEvent) {
    event.preventDefault();
    if (!issueForm.student) {
      toast.error("Selecciona un estudiante");
      return;
    }
    setBusy("issue");
    try {
      const data = await apiPost<{ success: boolean; certificate: IssuedCertificate }>("/certificate/issue", issueForm);
      setLastIssued(data.certificate);
      toast.success("Certificado firmado", { description: "Dilithium2 genero una firma valida." });
      await refreshHistory();
    } catch (error) {
      toast.error("No se pudo emitir", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy("");
    }
  }

  async function deliverIssuedCertificate(item: IssuedCertificate) {
    const recipient = item.certificate.student;
    setBusy(`deliver-${item.id}`);
    try {
      const data = await apiPost<ApiResult>("/certificates/deliver", {
        certId: item.id,
        studentName: recipient,
      });
      if (!data.success) throw new Error(data.error || "No se pudo entregar");
      toast.success("Certificado entregado", { description: "El contenido viajo cifrado con Kyber." });
      if (lastIssued?.id === item.id) setLastIssued({ ...item, status: "delivered" });
      setCurrentStudent(recipient);
      setReceived(null);
      await refreshHistory();
      const count = await refreshInbox(recipient);
      toast.message(`Bandeja de ${recipient}`, { description: `${count} certificado${count === 1 ? "" : "s"} entregado${count === 1 ? "" : "s"}.` });
    } catch (error) {
      toast.error("Entrega fallida", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy("");
    }
  }

  async function deliverCertificate() {
    if (!lastIssued) return;
    await deliverIssuedCertificate(lastIssued);
  }

  async function reloadStudentInbox() {
    if (!currentStudent) return;
    setBusy("refresh-inbox");
    try {
      await refreshHistory();
      const count = await refreshInbox(currentStudent);
      toast.success("Bandeja recargada", {
        description: `${currentStudent} tiene ${count} certificado${count === 1 ? "" : "s"} entregado${count === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      toast.error("No se pudo recargar bandeja", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy("");
    }
  }

  async function openCertificate(item: InboxItem) {
    if (!currentStudent) return;
    setBusy(`open-${item.id}`);
    try {
      const data = await apiPost<ReceivedCertificate & ApiResult>("/certificates/receive", {
        certId: item.id,
        studentName: currentStudent,
      });
      if (!data.success) throw new Error(data.error || "No se pudo abrir");
      setReceived({ certificate: data.certificate, signature: data.signature, valid: data.valid });
      toast.success("Certificado descifrado", { description: data.valid ? "Firma Dilithium2 verificada." : "La firma no coincide." });
    } catch (error) {
      toast.error("No se pudo abrir", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy("");
    }
  }

  async function activateWeakRng() {
    setBusy("lab1-activate");
    try {
      await apiPost<{ success: boolean }>("/labs/1/activate-weak-rng", {});
      setLabState((current) => ({ ...current, weakRngActive: true }));
      toast.warning("RNG debil activado", { description: "La universidad fue reinicializada con semilla fija 12345." });
    } catch (error) {
      toast.error("No se pudo activar", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy("");
    }
  }

  async function extractKey() {
    setBusy("lab1-extract");
    try {
      const data = await apiPost<{ privateKey: string; publicKey: string; seed: number }>("/labs/1/extract-key", {});
      setLabState((current) => ({ ...current, lab1PrivateKey: data.privateKey, lab1PublicKey: data.publicKey }));
      toast.warning("Clave privada regenerada", { description: `Semilla usada: ${data.seed}.` });
    } catch (error) {
      toast.error("Extraccion fallida", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy("");
    }
  }

  async function forgeCertificate() {
    setBusy("lab1-forge");
    const cert = { student: "Atacante", course: "Certificado fabricado", grade: 100, date: today() };
    try {
      const data = await apiPost<{ valid: boolean; signature: string }>("/labs/1/forge", cert);
      setLabState((current) => ({ ...current, lab1Signature: data.signature }));
      toast.warning(data.valid ? "Certificado falso aceptado" : "La falsificacion fallo", {
        description: "La firma se genero con la clave regenerada.",
      });
    } catch (error) {
      toast.error("Firma falsa fallida", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy("");
    }
  }

  async function interceptStudent() {
    if (!labState.lab2Student) return;
    setBusy("lab2-intercept");
    try {
      const data = await apiPost<{ success: boolean; originalPublicKey: string; malloryPublicKey: string; error?: string }>(
        `/labs/2/intercept/${encodeURIComponent(labState.lab2Student)}`,
        {},
      );
      if (!data.success) throw new Error(data.error || "No se pudo interceptar");
      setLabState((current) => ({
        ...current,
        lab2OriginalKey: data.originalPublicKey,
        lab2MalloryKey: data.malloryPublicKey,
        lab2IssuedCert: undefined,
        lab2Read: undefined,
      }));
      toast.warning("Clave sustituida", { description: `${labState.lab2Student} ahora expone la clave de Mallory.` });
    } catch (error) {
      toast.error("Intercepcion fallida", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy("");
    }
  }

  async function issueInterceptedCertificate() {
    if (!labState.lab2Student || !labState.lab2MalloryKey) return;
    setBusy("lab2-issue");
    try {
      const cert: Certificate = {
        student: labState.lab2Student,
        course: "Laboratorio MITM Kyber",
        grade: 100,
        date: today(),
      };
      const issued = await apiPost<{ certificate: IssuedCertificate } & ApiResult>("/certificate/issue", cert);
      if (!issued.success) throw new Error(issued.error || "No se pudo emitir certificado de laboratorio");

      const delivered = await apiPost<ApiResult>("/certificates/deliver", {
        certId: issued.certificate.id,
        studentName: labState.lab2Student,
      });
      if (!delivered.success) throw new Error(delivered.error || "No se pudo entregar certificado de laboratorio");

      setLabState((current) => ({
        ...current,
        lab2IssuedCert: { ...issued.certificate, status: "delivered" },
        lab2Read: undefined,
      }));
      setCurrentStudent(labState.lab2Student);
      setReceived(null);
      await refreshHistory();
      await refreshInbox(labState.lab2Student);
      toast.warning("Certificado interceptado emitido", {
        description: "Fue cifrado con la clave publica sustituida por Mallory.",
      });
    } catch (error) {
      toast.error("No se pudo preparar el ataque", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy("");
    }
  }

  async function malloryRead() {
    if (!labState.lab2Student) return;
    setBusy("lab2-read");
    try {
      const data = await apiPost<{ success: boolean; interceptedCertificate: Certificate; error?: string }>(
        `/labs/2/read/${encodeURIComponent(labState.lab2Student)}`,
        {},
      );
      if (!data.success) throw new Error(data.error || "Mallory no pudo leer");
      setLabState((current) => ({ ...current, lab2Read: data.interceptedCertificate }));
      toast.warning("Mallory leyo el certificado", { description: "Kyber cifro bien, pero la clave no estaba autenticada." });
    } catch (error) {
      toast.error("Lectura fallida", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy("");
    }
  }

  async function restoreAndForward() {
    if (!labState.lab2Student) return;
    setBusy("lab2-restore");
    try {
      const data = await apiPost<{ success: boolean; error?: string }>(
        `/labs/2/restore/${encodeURIComponent(labState.lab2Student)}`,
        {},
      );
      if (!data.success) throw new Error(data.error || "No se pudo restaurar");
      toast.success("Clave restaurada", { description: "El certificado fue recifrado para el estudiante real." });
      setCurrentStudent(labState.lab2Student);
      setReceived(null);
      await refreshInbox(labState.lab2Student);
    } catch (error) {
      toast.error("Restauracion fallida", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy("");
    }
  }

  async function createFakeIdentity() {
    setBusy("lab3-create");
    try {
      const data = await apiPost<{ success: boolean; fakePublicKey: string }>("/labs/3/create-fake", {});
      setLabState((current) => ({ ...current, lab3FakeKey: data.fakePublicKey }));
      toast.warning("Identidad falsa creada", { description: "Ahora existe una universidad impostora con su propia clave." });
    } catch (error) {
      toast.error("No se pudo crear identidad", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy("");
    }
  }

  async function signWithFakeIdentity() {
    setBusy("lab3-sign");
    const cert = { student: "Estudiante inventado", course: "Programa inexistente", grade: 100, date: today() };
    try {
      const data = await apiPost<{ success: boolean; verifiedWithFakeKey: boolean; signature: string; certificate: Certificate }>(
        "/labs/3/sign",
        cert,
      );
      if (!data.success) throw new Error("No se pudo firmar");
      setLabState((current) => ({ ...current, lab3Signature: data.signature, lab3Certificate: data.certificate }));
      toast.warning(data.verifiedWithFakeKey ? "Firma aceptada contra clave falsa" : "Verificacion rechazada", {
        description: "Sin PKI, la identidad de la clave sigue sin probarse.",
      });
    } catch (error) {
      toast.error("Firma impostora fallida", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="grid gap-6 border-b border-border pb-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="outline">PQC University</Badge>
              <Badge variant="secondary">Dilithium2</Badge>
              <Badge variant="secondary">Kyber</Badge>
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-normal text-balance sm:text-5xl">
              Laboratorio  de certificados PQC.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Emite, entrega, verifica y ataca certificados academicos para entender que protege la criptografia y que queda expuesto cuando falla la confianza.
            </p>
          </div>
          <Card className="self-end bg-foreground text-background">
            <CardContent className="grid grid-cols-3 gap-4 p-5">
              <Metric label="Emitidos" value={stats.issued} />
              <Metric label="Entregados" value={stats.delivered} />
              <Metric label="Bandeja" value={stats.inbox} />
            </CardContent>
          </Card>
        </header>

        <nav className="grid gap-2 sm:grid-cols-3">
          <NavButton active={view === "director"} icon={FileCheck} label="Director" onClick={() => setView("director")} />
          <NavButton
            active={view === "student"}
            icon={UserRound}
            label="Estudiante"
            onClick={() => {
              setView("student");
              refreshInbox().catch(() => undefined);
            }}
          />
          <NavButton active={view === "labs"} icon={Fingerprint} label="Laboratorios" onClick={() => setView("labs")} />
        </nav>

        <AnimatePresence mode="wait">
          {view === "director" ? (
            <MotionPanel key="director">
              <DirectorView
                busy={busy}
                students={students}
                studentName={studentName}
                setStudentName={setStudentName}
                createStudent={createStudent}
                issueForm={issueForm}
                setIssueForm={setIssueForm}
                issueCertificate={issueCertificate}
                lastIssued={lastIssued}
                deliverCertificate={deliverCertificate}
                deliverIssuedCertificate={deliverIssuedCertificate}
                history={history}
              />
            </MotionPanel>
          ) : null}
          {view === "student" ? (
            <MotionPanel key="student">
              <StudentView
                busy={busy}
                students={students}
                currentStudent={currentStudent}
                setCurrentStudent={(name) => {
                  setCurrentStudent(name);
                  setReceived(null);
                  refreshInbox(name).catch((error) => toast.error("No se pudo cargar bandeja", { description: error.message }));
                }}
                refreshInbox={reloadStudentInbox}
                inbox={inbox}
                openCertificate={openCertificate}
                received={received}
              />
            </MotionPanel>
          ) : null}
          {view === "labs" ? (
            <MotionPanel key="labs">
              <LabsView
                activeLab={activeLab}
                setActiveLab={setActiveLab}
                busy={busy}
                students={students}
                labState={labState}
                setLabState={setLabState}
                activateWeakRng={activateWeakRng}
                extractKey={extractKey}
                forgeCertificate={forgeCertificate}
                interceptStudent={interceptStudent}
                issueInterceptedCertificate={issueInterceptedCertificate}
                malloryRead={malloryRead}
                restoreAndForward={restoreAndForward}
                createFakeIdentity={createFakeIdentity}
                signWithFakeIdentity={signWithFakeIdentity}
              />
            </MotionPanel>
          ) : null}
        </AnimatePresence>

        <PqcPanel />
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-mono text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-background/60">{label}</p>
    </div>
  );
}

function NavButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof FileCheck; label: string; onClick: () => void }) {
  return (
    <Button variant={active ? "default" : "outline"} className="h-12 justify-start" onClick={onClick}>
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}

function DirectorView(props: {
  busy: string;
  students: string[];
  studentName: string;
  setStudentName: (value: string) => void;
  createStudent: (event: FormEvent) => void;
  issueForm: Certificate;
  setIssueForm: (value: Certificate | ((current: Certificate) => Certificate)) => void;
  issueCertificate: (event: FormEvent) => void;
  lastIssued: IssuedCertificate | null;
  deliverCertificate: () => void;
  deliverIssuedCertificate: (item: IssuedCertificate) => void;
  history: IssuedCertificate[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <SectionTitle icon={GraduationCap} title="Preparar estudiante" description="Genera un par Kyber para que el certificado tenga destinatario real." />
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={props.createStudent}>
              <Input placeholder="Nombre del estudiante" value={props.studentName} onChange={(event) => props.setStudentName(event.target.value)} />
              <Button type="submit" disabled={props.busy === "create-student"}>
                {props.busy === "create-student" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Crear
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle icon={FileCheck} title="Emitir certificado" description="El director firma los datos canonicos con la clave Dilithium2 de la universidad." />
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={props.issueCertificate}>
              <Select value={props.issueForm.student} onChange={(event) => props.setIssueForm((current) => ({ ...current, student: event.target.value }))}>
                <option value="">Selecciona estudiante</option>
                {props.students.map((student) => (
                  <option key={student} value={student}>
                    {student}
                  </option>
                ))}
              </Select>
              <Input
                placeholder="Curso o materia"
                value={props.issueForm.course}
                onChange={(event) => props.setIssueForm((current) => ({ ...current, course: event.target.value }))}
                required
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={props.issueForm.grade}
                  onChange={(event) => props.setIssueForm((current) => ({ ...current, grade: Number(event.target.value) }))}
                  required
                />
                <Input
                  type="date"
                  value={props.issueForm.date}
                  onChange={(event) => props.setIssueForm((current) => ({ ...current, date: event.target.value }))}
                  required
                />
              </div>
              <Button className="w-full" type="submit" disabled={props.busy === "issue" || props.students.length === 0}>
                {props.busy === "issue" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Firmar certificado
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <SectionTitle icon={BookOpen} title="Certificado activo" description="Despues de firmar, entregalo para cifrarlo con la clave Kyber del estudiante." />
          </CardHeader>
          <CardContent>
            <CertificatePreview
              cert={props.lastIssued?.certificate}
              footer={props.lastIssued?.status === "delivered" ? "Entregado y cifrado con Kyber" : "Firmado con Dilithium2"}
              valid
              action={
                props.lastIssued && props.lastIssued.status !== "delivered" ? (
                  <Button className="w-full" onClick={props.deliverCertificate} disabled={props.busy === "deliver"}>
                    {props.busy === "deliver" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Entregar a estudiante
                  </Button>
                ) : null
              }
            />
          </CardContent>
        </Card>

        <HistoryTable busy={props.busy} history={props.history} deliverIssuedCertificate={props.deliverIssuedCertificate} />
      </div>
    </div>
  );
}

function HistoryTable({
  busy,
  history,
  deliverIssuedCertificate,
}: {
  busy: string;
  history: IssuedCertificate[];
  deliverIssuedCertificate: (item: IssuedCertificate) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial</CardTitle>
        <CardDescription>Registro de certificados emitidos durante esta sesion.</CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <EmptyState text="Todavia no hay certificados emitidos." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Entrega</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.certificate.student}</TableCell>
                  <TableCell>{item.certificate.course}</TableCell>
                  <TableCell className="font-mono">{item.certificate.grade}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "delivered" ? "success" : "secondary"}>
                      {item.status === "delivered" ? "Entregado" : "Emitido"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.status === "delivered" ? (
                      <span className="text-sm text-muted-foreground">En bandeja</span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deliverIssuedCertificate(item)}
                        disabled={busy === `deliver-${item.id}`}
                      >
                        {busy === `deliver-${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Entregar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function StudentView(props: {
  busy: string;
  students: string[];
  currentStudent: string;
  setCurrentStudent: (value: string) => void;
  refreshInbox: () => void;
  inbox: InboxItem[];
  openCertificate: (item: InboxItem) => void;
  received: ReceivedCertificate | null;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <SectionTitle icon={UserRound} title="Identidad del estudiante" description="Selecciona la llave privada Kyber que intentara descifrar la bandeja." />
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Select value={props.currentStudent} onChange={(event) => props.setCurrentStudent(event.target.value)}>
              <option value="">Selecciona identidad</option>
              {props.students.map((student) => (
                <option key={student} value={student}>
                  {student}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={props.refreshInbox} disabled={!props.currentStudent || props.busy === "refresh-inbox"}>
              {props.busy === "refresh-inbox" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Recargar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionTitle icon={MailOpen} title="Bandeja cifrada" description="Cada elemento incluye encapsulado Kyber, datos cifrados y firma Dilithium2." />
              {props.currentStudent ? <Badge variant="outline">{props.inbox.length} en bandeja</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!props.currentStudent ? <EmptyState text="Selecciona un estudiante para abrir su bandeja." /> : null}
            {props.currentStudent && props.inbox.length === 0 ? (
              <EmptyState text={`No hay certificados entregados para ${props.currentStudent}. Emite y entrega uno desde Director.`} />
            ) : null}
            {props.inbox.map((item) => (
              <motion.div layout key={item.id} className="flex flex-col gap-3 rounded-lg border border-border bg-secondary p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{item.certificate.course}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Nota {item.certificate.grade} · {item.certificate.date}
                  </p>
                </div>
                <Button variant="outline" onClick={() => props.openCertificate(item)} disabled={props.busy === `open-${item.id}`}>
                  {props.busy === `open-${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Abrir
                </Button>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <SectionTitle icon={ShieldCheck} title="Certificado recibido" description="El resultado solo es confiable si el descifrado y la firma coinciden." />
        </CardHeader>
        <CardContent>
          <CertificatePreview cert={props.received?.certificate} footer="Descifrado con Kyber y verificado con Dilithium2" valid={props.received?.valid} />
          {props.received?.signature ? <Evidence label="Firma Dilithium2" value={truncateHex(props.received.signature, 52)} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function LabsView(props: {
  activeLab: LabId;
  setActiveLab: (value: LabId) => void;
  busy: string;
  students: string[];
  labState: LabState;
  setLabState: (value: LabState | ((current: LabState) => LabState)) => void;
  activateWeakRng: () => void;
  extractKey: () => void;
  forgeCertificate: () => void;
  interceptStudent: () => void;
  issueInterceptedCertificate: () => void;
  malloryRead: () => void;
  restoreAndForward: () => void;
  createFakeIdentity: () => void;
  signWithFakeIdentity: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-2 md:grid-cols-3">
        <LabButton active={props.activeLab === "lab1"} label="RNG debil" onClick={() => props.setActiveLab("lab1")} />
        <LabButton active={props.activeLab === "lab2"} label="MITM Kyber" onClick={() => props.setActiveLab("lab2")} />
        <LabButton active={props.activeLab === "lab3"} label="Falsa identidad" onClick={() => props.setActiveLab("lab3")} />
      </div>

      <AnimatePresence mode="wait">
        {props.activeLab === "lab1" ? (
          <MotionPanel key="lab1">
            <LabShell
              title="RNG debil"
              description="Una semilla fija permite regenerar llaves privadas y producir firmas aparentemente autenticas."
              lesson="La resistencia post-cuantica no compensa una fuente de entropia predecible."
            >
              <Step number="1" title="Reinicializa la universidad con semilla 12345">
                <Button variant={props.labState.weakRngActive ? "secondary" : "destructive"} onClick={props.activateWeakRng} disabled={props.busy === "lab1-activate"}>
                  {props.busy === "lab1-activate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                  {props.labState.weakRngActive ? "RNG debil activo" : "Activar RNG debil"}
                </Button>
              </Step>
              <Step number="2" title="Regenera la clave privada">
                <Button variant="outline" onClick={props.extractKey} disabled={!props.labState.weakRngActive || props.busy === "lab1-extract"}>
                  {props.busy === "lab1-extract" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Extraer clave
                </Button>
                <Evidence label="Clave privada regenerada" value={truncateHex(props.labState.lab1PrivateKey, 64)} tone="danger" />
                <Evidence label="Clave publica correspondiente" value={truncateHex(props.labState.lab1PublicKey, 64)} />
              </Step>
              <Step number="3" title="Firma un certificado fabricado">
                <Button variant="outline" onClick={props.forgeCertificate} disabled={!props.labState.lab1PrivateKey || props.busy === "lab1-forge"}>
                  <FileCheck className="h-4 w-4" />
                  Firmar falso
                </Button>
                <Evidence label="Firma resultante" value={truncateHex(props.labState.lab1Signature, 64)} tone="danger" />
              </Step>
            </LabShell>
          </MotionPanel>
        ) : null}

        {props.activeLab === "lab2" ? (
          <MotionPanel key="lab2">
            <LabShell
              title="MITM sobre Kyber"
              description="Kyber cifra para una clave publica, pero no prueba que esa clave pertenezca al estudiante correcto."
              lesson="El intercambio de claves necesita autenticacion: PKI, canal verificado o confianza fuera de banda."
            >
              <Step number="1" title="Sustituye la clave publica del estudiante">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Select value={props.labState.lab2Student} onChange={(event) => props.setLabState((current) => ({ ...current, lab2Student: event.target.value }))}>
                    <option value="">Selecciona victima</option>
                    {props.students.map((student) => (
                      <option key={student} value={student}>
                        {student}
                      </option>
                    ))}
                  </Select>
                  <Button variant="destructive" onClick={props.interceptStudent} disabled={!props.labState.lab2Student || props.busy === "lab2-intercept"}>
                    Interceptar
                  </Button>
                </div>
                <Evidence label="Clave original" value={truncateHex(props.labState.lab2OriginalKey, 46)} />
                <Evidence label="Clave de Mallory" value={truncateHex(props.labState.lab2MalloryKey, 46)} tone="danger" />
              </Step>
              <Step number="2" title="Emite y entrega un certificado dentro del lab">
                <p className="text-sm leading-6 text-muted-foreground">
                  Usa un estudiante ya creado. El laboratorio emite y entrega un certificado de prueba para ese estudiante mientras su clave publica esta sustituida.
                </p>
                <Button
                  variant="outline"
                  onClick={props.issueInterceptedCertificate}
                  disabled={!props.labState.lab2MalloryKey || props.busy === "lab2-issue"}
                >
                  {props.busy === "lab2-issue" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Emitir certificado interceptado
                </Button>
                <Evidence
                  label="Certificado de laboratorio"
                  value={props.labState.lab2IssuedCert ? JSON.stringify(props.labState.lab2IssuedCert.certificate, null, 2) : undefined}
                />
              </Step>
              <Step number="3" title="Mallory intenta leer la bandeja">
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={props.malloryRead} disabled={!props.labState.lab2IssuedCert || props.busy === "lab2-read"}>
                    Leer con Mallory
                  </Button>
                  <Button variant="secondary" onClick={props.restoreAndForward} disabled={!props.labState.lab2IssuedCert || props.busy === "lab2-restore"}>
                    Restaurar y reenviar
                  </Button>
                </div>
                <Evidence label="Certificado leido por Mallory" value={props.labState.lab2Read ? JSON.stringify(props.labState.lab2Read, null, 2) : undefined} tone="danger" />
              </Step>
            </LabShell>
          </MotionPanel>
        ) : null}

        {props.activeLab === "lab3" ? (
          <MotionPanel key="lab3">
            <LabShell
              title="Falsa identidad"
              description="Dilithium prueba que una firma pertenece a una clave publica, no que esa clave sea institucionalmente legitima."
              lesson="La firma criptografica necesita una capa de identidad: certificados, directorios confiables o huellas verificadas."
            >
              <Step number="1" title="Crea una universidad impostora">
                <Button variant="destructive" onClick={props.createFakeIdentity} disabled={props.busy === "lab3-create"}>
                  Crear identidad falsa
                </Button>
                <Evidence label="Clave publica impostora" value={truncateHex(props.labState.lab3FakeKey, 64)} tone="danger" />
              </Step>
              <Step number="2" title="Firma un certificado inexistente">
                <Button variant="outline" onClick={props.signWithFakeIdentity} disabled={!props.labState.lab3FakeKey || props.busy === "lab3-sign"}>
                  Firmar con impostor
                </Button>
                <Evidence label="Certificado impostor" value={props.labState.lab3Certificate ? JSON.stringify(props.labState.lab3Certificate, null, 2) : undefined} />
                <Evidence label="Firma impostora" value={truncateHex(props.labState.lab3Signature, 64)} tone="danger" />
              </Step>
            </LabShell>
          </MotionPanel>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function LabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <Button variant={active ? "default" : "outline"} className="h-11 justify-start" onClick={onClick}>
      <CircleDot className="h-4 w-4" />
      {label}
    </Button>
  );
}

function LabShell({ title, description, lesson, children }: { title: string; description: string; lesson: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={Fingerprint} title={title} description={description} />
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        <div className="rounded-lg border border-white bg-white p-5 text-black">
          <p className="text-sm font-semibold">Leccion</p>
          <p className="mt-2 text-sm leading-6 text-black/70">{lesson}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Step({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 rounded-lg border border-border bg-secondary p-4 md:grid-cols-[3rem_1fr]">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-foreground font-mono text-sm font-semibold text-background">{number}</div>
      <div className="space-y-3">
        <h3 className="font-medium">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

function PqcPanel() {
  return (
    <section className="grid gap-4 border-t border-border pt-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <SectionTitle icon={ShieldCheck} title="Dilithium2 / ML-DSA" description="Firma el certificado. Si el contenido cambia, la verificacion falla." />
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <SectionTitle icon={KeyRound} title="Kyber / ML-KEM" description="Entrega una clave compartida para cifrar el certificado hacia el estudiante correcto." />
        </CardHeader>
      </Card>
    </section>
  );
}
