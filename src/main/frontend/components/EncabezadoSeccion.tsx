import { type LucideIcon } from "lucide-react";

export function EncabezadoSeccion({
  icono: Icono,
  titulo,
  descripcion,
}: {
  icono: LucideIcon;
  titulo: string;
  descripcion?: string;
}) {
  return (
    <div className="encabezado-seccion">
      <div className="icono-encabezado">
        <Icono className="icono-pequeno" />
      </div>
      <div>
        <h2 className="texto-encabezado">{titulo}</h2>
        {descripcion ? <p className="descripcion-encabezado">{descripcion}</p> : null}
      </div>
    </div>
  );
}
