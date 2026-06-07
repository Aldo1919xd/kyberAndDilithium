export function PasoLaboratorio({ numero, titulo, children }: { numero: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="paso">
      <div className="numero-paso">{numero}</div>
      <div className="contenido-paso">
        <h3 className="texto-medio">{titulo}</h3>
        {children}
      </div>
    </div>
  );
}
