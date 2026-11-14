1. Template de contenido para compartir - DONE
2. Poder subir una imagen para compartir - DONE
3. Multi territorio - implementado, falta el despliegue (ver docs/designs/agenda-multidistricte.md)

Aplazado del diseño multidistrito:

- Formato y protección A:K en todas las pestañas de eventos.
- Caché de servidor (CacheService): descartada; se usa solo la copia del navegador (stale-while-revalidate, ver docs/designs/cache-navegador-agenda.md).
- Código de error propio para el tope de 3000 inscripciones.
- Eventos cancelados en `signup_`.
- `404.html` para la barra final (`/eixample/`).
