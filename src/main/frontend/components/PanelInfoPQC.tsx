import { ShieldCheck, KeyRound } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { EncabezadoSeccion } from "@/components/EncabezadoSeccion";

export function PanelInfoPQC() {
  return (
    <section className="panel-pqc">
      <Card>
        <CardHeader>
          <EncabezadoSeccion icono={ShieldCheck} titulo="Dilithium2 / ML-DSA" descripcion="Firma el certificado. Si el contenido cambia, la verificacion falla." />
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <EncabezadoSeccion icono={KeyRound} titulo="Kyber / ML-KEM" descripcion="Entrega una clave compartida para cifrar el certificado hacia el estudiante correcto." />
        </CardHeader>
      </Card>
    </section>
  );
}
