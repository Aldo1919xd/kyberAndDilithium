const API = "/api";

function jsonSeguro(texto: string) {
  try {
    return JSON.parse(texto);
  } catch {
    return { error: texto.slice(0, 160) };
  }
}

export async function peticionGet<T>(ruta: string): Promise<T> {
  const respuesta = await fetch(API + ruta);
  const texto = await respuesta.text();
  const contenido = texto ? jsonSeguro(texto) : {};
  if (!respuesta.ok) throw new Error(contenido.error || `HTTP ${respuesta.status}`);
  return contenido;
}

export async function peticionPost<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const respuesta = await fetch(API + ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const texto = await respuesta.text();
  const contenido = texto ? jsonSeguro(texto) : {};
  if (!respuesta.ok) throw new Error(contenido.error || `HTTP ${respuesta.status}`);
  return contenido;
}
