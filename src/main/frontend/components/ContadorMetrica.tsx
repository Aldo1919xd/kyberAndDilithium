export function ContadorMetrica({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div>
      <p className="valor-metrica">{valor}</p>
      <p className="etiqueta-metrica">{etiqueta}</p>
    </div>
  );
}
