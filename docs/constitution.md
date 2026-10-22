# Constitución de Sprout Tok

1. **Stack mínimo:** React, TypeScript, Vite, PixiJS y Tailwind; toda dependencia nueva requiere justificación en su spec.
2. **La spec manda:** ningún comportamiento se implementa si no está en la spec activa. Si falta una decisión, se detiene el trabajo y se pregunta.
3. **Reglas aisladas:** las acciones y cálculos viven en funciones TypeScript puras; React/PixiJS solo muestran estado y envían intenciones.
4. **Tests útiles:** cada regla de cultivo, riego, tala o cosecha tiene tests unitarios con Vitest; no se testea presentación trivial.
5. **Guardado local:** el estado se persiste únicamente en `localStorage`, bajo una clave versionada y con carga segura ante datos inválidos.
6. **Idioma consistente:** código en inglés; documentación, interfaz y mensajes al jugador en español.
