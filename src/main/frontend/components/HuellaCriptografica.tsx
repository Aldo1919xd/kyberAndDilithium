import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export function HuellaCriptografica({ etiqueta, valor, tono = "neutral" }: { etiqueta: string; valor?: string; tono?: "neutral" | "peligro" }) {
  return (
    <div className={cn("huella", tono === "peligro" && "huella-peligro")}>
      <div className="etiqueta-huella">
        <Terminal className="icono-mini" />
        {etiqueta}
      </div>
      <pre className="valor-huella">{valor || "Pendiente"}</pre>
    </div>
  );
}
