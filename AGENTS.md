# AGENTS.md — Sprout Tok

## Proyecto

Juego idle/tycoon de granja para un solo jugador: cultivar, regar, talar y cosechar.
Cliente web con React 19, TypeScript 6, Vite 8, PixiJS 8/@pixi/react y Tailwind CSS 4; las reglas del juego son funciones puras y la interfaz solo las representa.

## Comandos

- Ejecutar: `pnpm dev`
- Tests: `pnpm exec vitest run`
- Lint/formato: `pnpm lint && pnpm fmt:check`
- Compilar: `pnpm build`

## Estilo y convenciones

TypeScript 6 estricto, módulos ESM y componentes funcionales de React. Usa `camelCase` para variables y funciones, `PascalCase` para tipos y componentes, y nombres descriptivos en inglés.
El código y sus comentarios van en inglés; la documentación, interfaz y mensajes al jugador van en español.

## Reglas

- Lee `docs/constitution.md` y la spec activa antes de tocar código.
- No implementes comportamientos que no estén definidos en la spec activa; ante una decisión faltante, detén el trabajo y pregunta.
- No añadas dependencias, backend, servicios externos ni un gestor global de estado sin que la spec activa lo justifique y se apruebe.
- Mantén las reglas y cálculos fuera de React/PixiJS; no mezcles lógica de juego con componentes o renderizado.

## Al terminar cualquier tarea

- Ejecuta los tests pertinentes, `pnpm lint`, `pnpm fmt:check` y `pnpm build`; informa cualquier fallo no resuelto.
