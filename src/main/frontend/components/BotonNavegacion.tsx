import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BotonNavegacion({ activo, icono: Icono, etiqueta, onClick }: { activo: boolean; icono: LucideIcon; etiqueta: string; onClick: () => void }) {
  return (
    <Button variant={activo ? "default" : "outline"} className="boton-navegacion" onClick={onClick}>
      <Icono className="icono-pequeno" />
      {etiqueta}
    </Button>
  );
}
