import { Fingerprint } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EncabezadoSeccion } from "@/components/EncabezadoSeccion";

export function PlantillaLaboratorio({ titulo, descripcion, leccion, children }: { titulo: string; descripcion: string; leccion: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <EncabezadoSeccion icono={Fingerprint} titulo={titulo} descripcion={descripcion} />
      </CardHeader>
      <CardContent className="contenido-laboratorio">
        {children}
        <div className="leccion-lab">
          <p className="titulo-leccion">Leccion</p>
          <p className="texto-leccion">{leccion}</p>
        </div>
      </CardContent>
    </Card>
  );
}
