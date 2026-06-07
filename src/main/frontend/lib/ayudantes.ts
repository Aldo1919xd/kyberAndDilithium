export const hoy = () => new Date().toISOString().split("T")[0];

export function formatearFecha(valor: string) {
  return new Date(`${valor}T12:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function acortarHex(valor?: string, visibles = 36) {
  if (!valor) return "Sin evidencia";
  if (valor.length <= visibles * 2) return valor;
  return `${valor.slice(0, visibles)}...${valor.slice(-visibles)}`;
}
