# Plan técnico: prototipo inicial de Sprout Tok

## Alcance y trazabilidad

| Parte                                    | RF cubiertos                             |
| ---------------------------------------- | ---------------------------------------- |
| Mundo cuadriculado, destinos y objetivos | RF-1, RF-2, RF-3                         |
| Acciones y mutaciones de granja          | RF-3, RF-4, RF-5, RF-6, RF-7             |
| Renderizado e interacción                | RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7 |
| Guardado local y restauración            | RF-5, RF-6 y requisitos no funcionales   |
| Pruebas de reglas                        | RF-1 a RF-7                              |

## Estructura de módulos

| Módulo                   | Responsabilidad                                                                                             | RF cubiertos                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `src/game/model.ts`      | Tipos del estado, coordenadas, direcciones, objetivos, acciones e inventario.                               | RF-1 a RF-7                            |
| `src/game/world.ts`      | Creación de partida, límites, transitabilidad, ocupación y distribución 40/30/20/10 de cultivos iniciales.  | RF-1                                   |
| `src/game/navigation.ts` | Validación de destinos, selección de parcela adyacente más cercana y desempate norte, este, sur, oeste.     | RF-1, RF-2, RF-3                       |
| `src/game/commands.ts`   | Traducción de una intención de clic/toque a movimiento, interacción, mensaje o ignorar.                     | RF-1, RF-2, RF-3                       |
| `src/game/actions.ts`    | Inicio, cancelación y finalización diferida de labranza, tala y riego; plantación y cosecha inmediatas.     | RF-3 a RF-7                            |
| `src/game/time.ts`       | Cálculo con tiempo real de acciones, enfriamiento de riego y desaparición de árboles.                       | RF-3, RF-5, RF-6                       |
| `src/game/messages.ts`   | Mensajes de resultado para el jugador, todos en español.                                                    | RF-3, RF-5, RF-6, RF-7                 |
| `src/game/save.ts`       | Serialización versionada, lectura segura, descarte de datos inválidos y normalización a `idle`.             | RF-5, RF-6 y requisitos no funcionales |
| `src/ui/GameScreen.tsx`  | Orquesta el estado de juego, despacha intenciones y solicita guardado tras cada cambio. No contiene reglas. | RF-1 a RF-7                            |
| `src/ui/FarmScene.tsx`   | Representa mapa, personaje, árboles y cultivos; convierte clic/toque en una intención con coordenadas.      | RF-1 a RF-7                            |
| `src/ui/StatusPanel.tsx` | Muestra inventario, estado del personaje y mensajes en español.                                             | RF-3, RF-6, RF-7                       |

Los módulos bajo `src/game` solo reciben datos y devuelven datos nuevos o resultados; no acceden al renderizado, eventos del navegador ni almacenamiento. La capa `src/ui` presenta el estado y envía intenciones, cumpliendo la separación exigida por la constitución.

## Modelo de datos

**RF cubiertos: RF-1 a RF-7 y requisitos no funcionales de guardado.**

El guardado contiene únicamente datos persistentes. Una acción activa no se guarda: al restaurar una partida el personaje queda en `idle`, tal como exige la spec. Las marcas de tiempo son milisegundos Unix para que los temporizadores continúen mientras el juego está cerrado.

```json
{
  "version": 1,
  "savedAt": 1767225600000,
  "map": {
    "width": 8,
    "height": 6,
    "tiles": [
      { "x": 0, "y": 0, "kind": "grass", "walkable": true },
      { "x": 1, "y": 1, "kind": "soil", "walkable": true, "tilled": true }
    ]
  },
  "character": {
    "position": { "x": 0, "y": 0 },
    "facing": "east",
    "state": "idle"
  },
  "trees": [
    {
      "id": "tree-1",
      "position": { "x": 3, "y": 1 },
      "status": "reduced",
      "reducedAt": 1767225300000
    }
  ],
  "crops": [
    {
      "id": "crop-1",
      "position": { "x": 1, "y": 1 },
      "stage": 2,
      "lastWateredAt": 1767225540000
    }
  ],
  "inventory": { "crop": 3 }
}
```

Reglas derivadas del modelo:

- Una parcela con cultivo está ocupada; un árbol ocupa su posición y no es transitable.
- Un cultivo en etapa 4 es cosechable y no regable; un cultivo plantado inicia en etapa 1.
- La elegibilidad de riego se calcula comparando `now` con `lastWateredAt`; es válida desde el minuto exacto posterior al último riego válido.
- Un árbol `reduced` desaparece cuando `now` alcanza cinco minutos desde `reducedAt`.
- El estado visible de acción y el destino pendiente son transitorios y se reinician a `idle` al restaurar.

## Algoritmo en pseudocódigo

**RF cubiertos: RF-1 a RF-7.**

```text
AL RECIBIR_INTENCIÓN_SELECCION(coordenada, ahora):
  normalizarTemporizadores(estado, ahora)
  cancelarAcciónActivaYDestinoPendiente(estado)

  objetivo = buscarObjetivoEn(coordenada)
  SI objetivo no existe:
    SI coordenada está dentro del mapa Y es transitable:
      asignarDestino(coordenada)
      estadoPersonaje = walking
    SI NO:
      estadoPersonaje = idle
      mostrarMensajeEspañolDeDestinoInválido()
    TERMINAR

  SI objetivo es árbol reducido o cultivo de etapa 4 para riego:
    mostrarMensajeEspañolDeAcciónNoDisponible()
    estadoPersonaje = idle
    TERMINAR

  parcela = elegirParcelaAdyacenteTransitableMásCercana(objetivo)
  SI parcela no existe:
    mostrarMensajeEspañolDeObjetivoInalcanzable()
    estadoPersonaje = idle
    TERMINAR

  moverHacia(parcela) si no está allí
  orientarHacia(objetivo)
  AL ESTAR_ADYACENTE_Y_ORIENTADO:
    SI objetivo es parcela labrada vacía: crearCultivoEnEtapa1SinConsumirInventario(); TERMINAR
    SI objetivo es cultivo cosechable: eliminarCultivoYSumarUnaUnidadAlInventario(); TERMINAR
    SI objetivo es tierra sin labrar: iniciarAcción(tilling dirt, 3 segundos)
    SI objetivo es árbol disponible: iniciarAcción(chopping, 3 segundos)
    SI objetivo es cultivo regable y su enfriamiento terminó: iniciarAcción(watering, 3 segundos)
    EN OTRO CASO: mostrarMensajeEspañolDeAcciónNoDisponible(); estadoPersonaje = idle

AL FINALIZAR_ACCIÓN(activa, ahora):
  SI activa no coincide con la acción aún activa O el objetivo ya no es válido:
    estadoPersonaje = idle; TERMINAR
  SI activa es tilling dirt: marcarParcelaComoLabrada()
  SI activa es chopping: marcarÁrbolComoReducido(ahora)
  SI activa es watering: avanzarEtapaUnaVezYGuardarÚltimoRiego(ahora)
  estadoPersonaje = idle

AL RESTAURAR_PARTIDA(datos, ahora):
  SI los datos no cumplen el esquema y la versión esperada:
    crearPartidaNueva(); mostrarMensajeEspañolDeGuardadoDescartado()
  SI NO:
    cargarDatos(); cancelarAcciónActivaYDestinoPendiente(); normalizarTemporizadores(ahora)
```

`elegirParcelaAdyacenteTransitableMásCercana` evalúa norte, este, sur y oeste; elige la de menor distancia de ruta y conserva ese orden como desempate. El tiempo se consulta al procesar una intención, al terminar una acción y al restaurar la partida.

## Contrato entre lógica e interfaz

**RF cubiertos: RF-1 a RF-7.**

| Entrada de la interfaz                             | Respuesta de la lógica                                                      | Resultado visible                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `select(position, now)` por clic o toque           | Estado actualizado, movimiento o interacción pendiente, y mensaje opcional. | Personaje camina, actúa, queda `idle` o se muestra un mensaje.                            |
| `arrive(now)` al alcanzar el siguiente destino     | Estado actualizado y posible comienzo de acción.                            | Orientación correcta y estado `tilling dirt`, `chopping` o `watering` cuando corresponda. |
| `completeAction(actionId, now)` tras tres segundos | Estado actualizado; efecto aplicado o acción cancelada.                     | Tierra labrada, árbol reducido o cultivo crecido.                                         |
| `restore(savedData, now)` al abrir el juego        | Partida válida normalizada o partida nueva con mensaje.                     | Mapa e inventario restaurados; personaje en `idle`.                                       |

La interfaz debe usar un único tipo de evento de puntero para unificar clic y toque. Cada celda u objeto interactuable comunica sus coordenadas a la lógica; la lógica decide el objetivo, no el renderizador.

## Decisiones técnicas

**RF cubiertos: RF-1 a RF-7 y requisitos no funcionales.**

| Decisión                                                                | Justificación                                                                                                                                                                      | Alternativa descartada                                                                                                 |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Cuadrícula discreta para el mapa y el personaje                         | Hace verificables los límites, la transitabilidad, la adyacencia de un bloque y el desempate de rutas.                                                                             | Posicionamiento libre por píxeles; añade ambigüedad en alcance y colisiones para el MVP.                               |
| Reglas puras con `now` y generador aleatorio recibidos como datos       | Permite probar temporizadores, distribuciones y mutaciones de manera determinista.                                                                                                 | Leer reloj y aleatoriedad directamente en componentes; acopla las reglas y dificulta las pruebas.                      |
| Una acción transitoria identificada por objetivo y hora de finalización | Asegura los tres segundos, permite cancelarla por una orden nueva y evita aplicar su efecto anticipadamente.                                                                       | Aplicar la mutación al iniciar la animación; contradice la spec y no permite cancelación limpia.                       |
| Marcas de tiempo absolutas persistidas                                  | Mantiene el minuto de enfriamiento y los cinco minutos del árbol aunque la aplicación esté cerrada.                                                                                | Contadores que avanzan solo mientras la aplicación está abierta; incumple RF-5 y RF-6.                                 |
| Guardado local versionado y validado                                    | Cumple la constitución, permite descartar guardados incompatibles sin bloquear la partida y evita dependencias nuevas.                                                             | Backend, base de datos o biblioteca de persistencia; quedan fuera del stack y del alcance.                             |
| PixiJS para escena e interacción; React para composición y paneles      | Reutiliza las dependencias existentes y separa la representación del dominio. Las zonas interactivas usan eventos de puntero estáticos y áreas de impacto rectangulares por celda. | Añadir un motor, biblioteca de estado o sistema de física; no aporta valor al MVP y aumenta la carga de mantenimiento. |
| Formas y colores simples para el prototipo                              | Permite hacer distinguibles personaje, tierra, árboles, cultivos y estados sin depender de assets nuevos.                                                                          | Spritesheets y animaciones detalladas; están fuera de alcance.                                                         |

## Estrategia de tests

**RF cubiertos: RF-1 a RF-7 y principio 4 de la constitución.**

Se crearán pruebas unitarias con Vitest para todos los módulos bajo `src/game`. Usarán hora y aleatoriedad controladas; no requerirán renderizado ni probarán JSX o gráficos triviales.

| Grupo de pruebas      | Casos mínimos                                                                                                                                                                                                 | RF cubiertos           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Mundo y navegación    | Límites, terreno transitable, árboles/cultivos no transitables, objetivo reconocido, distribución inicial 40/30/20/10, selección de adyacente más cercana y desempate N/E/S/O.                                | RF-1, RF-3             |
| Movimiento y órdenes  | Destino vacío válido, destino inválido, llegada a `idle`, sustitución por la última orden, clic y toque con la misma intención.                                                                               | RF-1, RF-2             |
| Acciones              | Inicio solo desde adyacencia orientada, tres segundos sin mutación previa, efecto al finalizar, cancelación por orden nueva, objetivo retirado antes de finalizar.                                            | RF-3, RF-4, RF-5, RF-6 |
| Labranza y plantación | Tierra queda labrada, plantación en parcela vacía, bloqueo de parcela ocupada, plantación ilimitada sin consumo de inventario.                                                                                | RF-4                   |
| Tala                  | Reducción tras acción, ignorar árbol reducido, desaparición a los cinco minutos exactos, desaparición tras restaurar.                                                                                         | RF-5                   |
| Riego y crecimiento   | Avance de una etapa por riego finalizado, enfriamiento antes y en el minuto exacto, tres riegos de cultivo plantado, riegos restantes de cada etapa inicial, bloqueo de etapa 4 y continuidad tras restaurar. | RF-6                   |
| Cosecha               | Solo etapa 4, retirada del cultivo, suma de una unidad, inventario sin límite y sin avance de cultivo no cosechable.                                                                                          | RF-7                   |
| Guardado              | Versión válida, conservación de mapa/inventario/marcas de tiempo, reinicio a `idle`, datos inválidos o incompatibles descartados y mensaje en español.                                                        | RF-5, RF-6             |

La verificación manual se limita a confirmar que el mapa y estados son distinguibles, que un toque y un clic despachan la misma intención y que los mensajes están en español. No se añadirán pruebas de presentación trivial.
