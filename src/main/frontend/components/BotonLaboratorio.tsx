import { CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BotonLaboratorio({ activo, etiqueta, onClick }: { activo: boolean; etiqueta: string; onClick: () => void }) {
  return (
    <Button variant={activo ? "default" : "outline"} className="boton-laboratorio" onClick={onClick}>
      <CircleDot className="icono-pequeno" />
      {etiqueta}
    </Button>
  );
}
