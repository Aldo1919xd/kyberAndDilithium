import { Send, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContenedorVacio } from "@/components/ContenedorVacio";
import type { CertificadoFirmado } from "@/types";

export function TablaHistorial({
  operacionPendiente,
  historial,
  onEntregarCertificado,
}: {
  operacionPendiente: string;
  historial: CertificadoFirmado[];
  onEntregarCertificado: (item: CertificadoFirmado) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial</CardTitle>
        <CardDescription>Registro de certificados emitidos durante esta sesion.</CardDescription>
      </CardHeader>
      <CardContent>
        {historial.length === 0 ? (
          <ContenedorVacio texto="Todavia no hay certificados emitidos." />
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
              {historial.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="texto-medio">{item.certificado.estudiante}</TableCell>
                  <TableCell>{item.certificado.curso}</TableCell>
                  <TableCell className="texto-mono">{item.certificado.nota}</TableCell>
                  <TableCell>
                    <Badge variant={item.estado === "entregado" ? "success" : "secondary"}>
                      {item.estado === "entregado" ? "Entregado" : "Emitido"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.estado === "entregado" ? (
                      <span className="texto-apagado">En bandeja</span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEntregarCertificado(item)}
                        disabled={operacionPendiente === `deliver-${item.id}`}
                      >
                        {operacionPendiente === `deliver-${item.id}` ? <Loader2 className="icono-girando" /> : <Send className="icono-pequeno" />}
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
