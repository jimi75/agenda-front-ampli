1. Template de contenido para compartir - DONE
2. Poder subir una imagen para compartir - DONE
3. Multi territorio - implementado, falta el despliegue (ver docs/designs/agenda-multidistricte.md)

Aplazado del diseño multidistrito:

- Formato y protección A:K en todas las pestañas de eventos.
- Caché de la agenda con CacheService (cada inscripción tendría que borrar la caché de todos los distritos).
- Código de error propio para el tope de 3000 inscripciones.
- Eventos cancelados en `signup_`.
- `404.html` para la barra final (`/eixample/`).
