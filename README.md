# PQC University

Proyecto unico con backend Spring Boot y frontend React/Vite.

## Estructura

- `src/main/java`: backend Spring Boot.
- `frontend/src`: frontend React con Tailwind, shadcn-style components y Framer Motion.
- `src/main/resources/static`: salida compilada del frontend que sirve Spring Boot.

No necesitas abrir `frontend/` como proyecto aparte. Abre esta carpeta raiz y trabaja todo desde aqui.

## Comandos desde la raiz

```bash
npm run build
```

Compila React y escribe el resultado en `src/main/resources/static`.

```bash
npm run dev:api
```

Levanta Spring Boot en el puerto configurado, normalmente `8080`.

```bash
npm run dev:api:8081
```

Levanta Spring Boot en `8081` si `8080` ya esta ocupado.

```bash
npm run dev:ui
```

Levanta solo Vite para trabajar la UI con recarga rapida. Las rutas `/api/*` se proxyean a Spring Boot en `http://localhost:8080`.

```bash
npm run dev:ui:8081
```

Usa este comando si levantaste Spring Boot con `npm run dev:api:8081`.

```bash
npm test
```

Ejecuta typecheck del frontend y pruebas Maven del backend.
