# Plan técnico: segundo MVP de Sprout Tok

## Alcance y trazabilidad

| Parte                                                      | RF cubiertos                 |
| ---------------------------------------------------------- | ---------------------------- |
| Estado de stamina, carrera y progreso temporal persistente | RF-3, RF-4, RF-5, RF-6, RF-7 |
| Movimiento continuo, rutas, referencias activas y órdenes  | RF-2, RF-4, RF-5, RF-6       |
| Presentación del puntero, hover, ruta y stamina            | RF-1, RF-2, RF-3             |
| Guardado local, restauración y normalización temporal      | RF-3, RF-5, RF-6, RF-7       |
| Pruebas de reglas y verificación visual                    | RF-1 a RF-7                  |

No se añadirán dependencias. Las reglas de carrera, stamina y tiempo se mantendrán fuera de React y PixiJS, como exige la constitución.

## Estructura de módulos

| Módulo                         | Responsabilidad                                                                                                                                                                                     | RF cubiertos           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `src/game/model.ts`            | Amplía los tipos de personaje, movimiento, referencia activa y stamina; distingue los datos persistentes de los transitorios.                                                                       | RF-3 a RF-7            |
| `src/game/stamina.ts`          | Contiene reglas puras para limitar stamina, acumular y consumir segundos de carrera, recuperar stamina, pausar o reanudar su progreso y procesar el tiempo cerrado con cadencia `idle`.             | RF-3, RF-5, RF-6, RF-7 |
| `src/game/movement.ts`         | Avanza movimiento continuo por tramos con la velocidad de `walking` o `running`; coordina los hitos de llegada, consumo completo de carrera y agotamiento sin modificar la continuidad de posición. | RF-2, RF-4, RF-5, RF-6 |
| `src/game/navigation.ts`       | Conserva la creación y validación de rutas, la selección de parcela adyacente y las consultas necesarias para decidir si una orden tiene ruta válida.                                               | RF-2, RF-4             |
| `src/game/commands.ts`         | Traduce una selección en carrera, redirección, interacción o cancelación; compara la selección con la referencia activa y resuelve órdenes sin ruta.                                                | RF-2, RF-4, RF-5, RF-6 |
| `src/game/actions.ts`          | Mantiene las acciones contextuales existentes y comunica su inicio y final para pausar o reanudar la recuperación de stamina.                                                                       | RF-6                   |
| `src/game/time.ts`             | Normaliza los temporizadores existentes y delega el avance de stamina según el estado del personaje y la hora recibida.                                                                             | RF-3, RF-5, RF-6, RF-7 |
| `src/game/save.ts`             | Actualiza el guardado local versionado, valida stamina y sus progresos parciales, descarta datos incompatibles y restaura en `idle`.                                                                | RF-3, RF-7             |
| `src/game/messages.ts`         | Conserva los mensajes en español para órdenes inválidas o no disponibles cuando correspondan a los flujos existentes.                                                                               | RF-2, RF-4             |
| `src/ui/GameScreen.tsx`        | Entrega intenciones y horas actuales a las reglas, solicita pulsos mientras haya movimiento o recuperación aplicable y guarda cambios persistentes; no calcula reglas.                              | RF-2 a RF-7            |
| `src/ui/FarmScene.tsx`         | Representa personaje, ruta pendiente, stamina en la zona superior del canvas y el feedback de puntero; convierte eventos de puntero en intención de selección.                                      | RF-1, RF-2, RF-3, RF-4 |
| `src/ui/FarmSceneSelection.ts` | Conserva la conversión de coordenadas de puntero a tile y gestiona únicamente el estado visual transitorio de ratón o lápiz: entrada, salida, posición y tile bajo hover.                           | RF-1                   |
| `src/ui/StatusPanel.tsx`       | Mantiene la presentación de inventario, estado y mensajes existentes sin duplicar el indicador de stamina que corresponde al canvas.                                                                | RF-3                   |

Los módulos de `src/game` reciben estado, intenciones, hora y aleatoriedad como datos, y devuelven un nuevo estado o resultado. No acceden al reloj, eventos del navegador, `localStorage` ni renderizado. Los módulos de `src/ui` representan datos derivados y envían intenciones; el hover y la posición del puntero son estado puramente visual y no forman parte del estado de juego ni del guardado.

## Modelo de datos

**RF cubiertos: RF-2 a RF-7 y requisitos no funcionales de persistencia.**

El guardado elevará su versión para incluir stamina y sus dos progresos parciales. Se conservarán el progreso de recuperación y la fracción de carrera aunque el movimiento activo no se restaure. Las marcas son milisegundos Unix y los acumuladores son milisegundos.

```json
{
  "version": 4,
  "savedAt": 1767225600000,
  "lastTreeGenerationAttemptAt": 1767225300000,
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
  "stamina": {
    "value": 12,
    "recoveryProgressMs": 9000,
    "runningProgressMs": 450
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
      "growthReadyAt": 1767225600000
    }
  ],
  "inventory": { "crop": 3, "log": 1 }
}
```

Reglas derivadas del modelo:

- `stamina.value` es un entero inclusivo entre 0 y 36. Una partida nueva lo inicializa en 36.
- `recoveryProgressMs` representa tiempo real acumulado que todavía no produjo un punto de stamina. Es un valor no negativo menor que la cadencia aplicable después de normalizar; al alcanzar 36 se restablece a 0.
- `runningProgressMs` representa la fracción acumulada de carrera pendiente de completar un segundo de consumo. Es un valor no negativo menor que 1 000 después de normalizar y se conserva entre carreras y en el guardado.
- El estado transitorio de movimiento conserva posición continua, tramo activo, ruta pendiente, referencia activa y la hora de su último avance. La referencia activa es el tile seleccionado para un destino vacío o la identidad del objetivo seleccionado para una interacción contextual.
- Los marcadores de ruta se derivan de los tiles pendientes del movimiento transitorio. El puntero personalizado, el cursor habitual y el tile bajo hover se derivan exclusivamente del estado visual local y no se guardan.
- Acciones activas, ruta, referencia activa, estado `running` y posición continua no se guardan. Al restaurar, el personaje queda `idle`, igual que en el MVP anterior; `runningProgressMs` sí se restaura porque es progreso persistente de consumo.
- La recuperación no avanza durante `running` ni durante una acción contextual. Su progreso se pausa, no se descarta.
- Durante el tiempo cerrado, el progreso de recuperación existente se incrementa usando exclusivamente la cadencia de `idle` (15 segundos). Si alcanza 36, se descarta el progreso restante y se restablece a 0.

## Algoritmo en pseudocódigo

**RF cubiertos: RF-2 a RF-7.**

```text
AL AVANZAR_STAMINA(estado, duración, estadoPersonaje):
  SI stamina.value ES 36:
    stamina.recoveryProgressMs = 0
    TERMINAR

  SI estadoPersonaje ES idle O walking:
    stamina.recoveryProgressMs += duración
    cadencia = 15 segundos SI estadoPersonaje ES idle; EN OTRO CASO 30 segundos
    MIENTRAS stamina.recoveryProgressMs >= cadencia Y stamina.value < 36:
      stamina.value += 1
      stamina.recoveryProgressMs -= cadencia
    SI stamina.value ES 36:
      stamina.recoveryProgressMs = 0
  SI estadoPersonaje ES running O una acción está activa:
    conservar stamina.recoveryProgressMs sin cambios

AL AVANZAR_MOVIMIENTO_Y_STAMINA_HASTA(estado, ahora):
  MIENTRAS hay un tramo activo Y horaDelTramo < ahora:
    calcular el siguiente hito entre:
      ahora
      llegada al final del tramo según velocidad actual
      completar un segundo de carrera, SI estadoPersonaje ES running

    duración = siguienteHito - horaDelTramo
    SI estadoPersonaje ES running:
      mover de forma continua al doble de la velocidad de walking durante duración
      stamina.runningProgressMs += duración
      POR CADA segundo completo acumulado:
        stamina.value = máximo(0, stamina.value - 1)
        stamina.runningProgressMs -= 1 segundo
        SI stamina.value < 13:
          estadoPersonaje = walking
          pausar recuperación hasta terminar este hito; después reanudarla como walking
          TERMINAR el procesamiento del segundo de carrera
    SI estadoPersonaje ES walking:
      mover de forma continua a velocidad de walking durante duración
      avanzarStamina(estado, duración, walking)

    actualizar horaDelTramo al hito
    SI se alcanzó el final del tramo:
      confirmar la parcela lógica alcanzada
      SI quedan tramos: continuar con el siguiente
      SI NO: resolver llegada

AL RECIBIR_INTENCIÓN_SELECCIÓN(referencia, ahora):
  avanzarMovimientoYStaminaHasta(estado, ahora)
  normalizarTemporizadoresExistentes(estado, ahora)

  SI personaje.state ES walking Y referencia ES referenciaActiva:
    SI stamina.value >= 13:
      personaje.state = running
    TERMINAR

  SI personaje.state ES running Y referencia ES referenciaActiva:
    conservar estado sin cambios
    TERMINAR

  SI existe acción contextual activa:
    cancelar la acción según las reglas existentes
    personaje.state = idle
    TERMINAR

  resultado = prepararOrdenDesdePosiciónContinua(referencia)
  SI resultado no tiene ruta válida:
    cancelar movimiento activo y referencia activa
    personaje.state = idle
    TERMINAR

  sustituir ruta y referencia activa por la última orden
  personaje.state = walking

AL CAMBIAR_ENTRE_IDLE_Y_WALKING(estado, ahora):
  SI un intervalo de recuperación vence exactamente en ahora:
    aplicar primero la recuperación usando el estado anterior
  aplicar el nuevo estado y conservar recoveryProgressMs restante

AL RESOLVER_LLEGADA(estado, ahora):
  eliminar ruta y marcadores derivados
  SI existe interacción contextual pendiente Y su objetivo sigue disponible:
    iniciar o resolver la interacción conforme a las reglas existentes
  SI existe interacción contextual pendiente Y su objetivo dejó de estar disponible:
    no ejecutar acción
  SI no se inició acción:
    personaje.state = idle

AL RESTAURAR_PARTIDA(datos, ahora):
  SI datos no cumplen versión 4 y esquema completo, incluidos stamina y progresos:
    crear partida nueva con stamina 36 y mensaje en español
    TERMINAR

  cargar estado persistente
  duraciónCerrado = máximo(0, ahora - savedAt)
  avanzarStamina(estado, duraciónCerrado, idle)
  cancelar movimiento, referencia activa y acción; personaje.state = idle
  normalizar temporizadores existentes de cultivos, árboles y generación
```

La interfaz enviará un pulso con `now` mientras haya movimiento activo. Para que la recuperación en `idle` sea visible sin interacción, también enviará pulsos mientras la stamina sea inferior a 36; esos pulsos no contienen cálculo de stamina. La recepción de una selección siempre avanza primero el estado hasta su hora, lo que garantiza que una recuperación que lleva la stamina de 12 a 13 se aplique antes de evaluar la petición de carrera en esa misma hora.

## Contrato entre lógica e interfaz

**RF cubiertos: RF-1 a RF-7.**

| Entrada de la interfaz                                                | Respuesta de la lógica                                                                                                                                                 | Resultado visible                                                                                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `select(reference, now)` por clic o toque                             | Avanza movimiento y stamina hasta `now`; compara la referencia con la activa; inicia carrera, conserva carrera, redirige o deja `idle` según corresponda.              | El personaje corre, camina, conserva su recorrido o se detiene; los marcadores muestran solo la ruta vigente.                         |
| `advanceMovement(now)` mientras haya ruta                             | Avanza posición continua, llegada, consumo de carrera, transición por stamina insuficiente y recuperación aplicable.                                                   | El personaje se mueve sin saltos; al quedar bajo 13 pasa de carrera a caminata en el mismo punto.                                     |
| `advanceTime(now, random)` durante la partida                         | Normaliza temporizadores existentes y recuperación de stamina aplicable al estado actual.                                                                              | La stamina aumenta en `idle` o `walking`; los cambios agrícolas existentes se mantienen.                                              |
| `restore(savedData, now)` al abrir                                    | Valida guardado, aplica recuperación cerrada con cadencia `idle`, restaura stamina y sus progresos, cancela estado transitorio y normaliza el resto de temporizadores. | El personaje aparece `idle`, la stamina refleja el tiempo cerrado y un dato inválido inicia una partida nueva con mensaje en español. |
| Evento de entrada, salida o movimiento de ratón/lápiz sobre el canvas | Actualiza solo el estado visual local de posición y tile bajo hover; no envía una intención de juego.                                                                  | Se muestra u oculta el puntero personalizado; el marco sigue el tile bajo hover y no aparece con toque.                               |
| Estado de juego y estado visual local                                 | No requiere respuesta de lógica adicional: la escena deriva ruta, stamina, puntero, marco e indicadores.                                                               | La stamina aparece en la parte superior del canvas; los marcadores son distinguibles de hover, puntero e indicadores de cultivo.      |

## Decisiones técnicas

**RF cubiertos: RF-1 a RF-7 y requisitos no funcionales.**

| Decisión                                                                | Justificación                                                                                                                                                            | Alternativa descartada                                                                                                                       |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Ampliar el guardado a versión 4 con stamina y ambos progresos parciales | Conserva exactamente el valor de stamina, la recuperación incompleta y la fracción de carrera entre sesiones; permite descartar de forma segura guardados incompatibles. | Derivar esos valores solo de `savedAt`; no permite conservar la fracción de carrera ni el progreso previo de recuperación.                   |
| Acumuladores en milisegundos y `now` recibido como dato                 | Expresa los umbrales exactos de 15 s, 30 s y 1 s, permite procesar múltiples intervalos y hace deterministas las pruebas.                                                | Temporizadores propios de componentes o contadores por fotograma; dependen del renderizado y dificultan pruebas y restauración.              |
| Avance por hitos de movimiento, consumo y llegada                       | Evita que un pulso grande cruce sin control una llegada o el agotamiento; permite cambiar de carrera a caminata a mitad de tramo sin discontinuidad.                     | Aplicar una velocidad única al pulso completo y descontar stamina al final; puede recorrer distancia de carrera después de quedarse bajo 13. |
| Ruta y marcadores derivados del movimiento transitorio                  | Los marcadores siempre reflejan la ruta vigente y se retiran automáticamente al llegar, redirigir o cancelar.                                                            | Persistir o mutar marcadores por separado; duplica estado y permite que diverjan de la ruta.                                                 |
| Referencia activa explícita                                             | Distingue de forma inequívoca entre un tile de destino y un objetivo contextual, y permite decidir cuándo una selección activa carrera.                                  | Comparar solo el tile de llegada; contradice la selección repetida sobre el objetivo contextual.                                             |
| Hover local limitado a ratón y lápiz                                    | Cumple la diferencia entre dispositivos con hover y toque, sin convertir una selección táctil en estado de juego.                                                        | Simular hover persistente tras cada toque; alteraría el feedback definido para interacción táctil.                                           |
| Puntero, marco y stamina dibujados en la escena existente               | Mantiene el indicador de stamina en la parte superior del canvas y evita duplicar el estado de presentación en paneles externos.                                         | Añadir una segunda superficie o un control externo para stamina; no satisface que se muestre en el canvas.                                   |
| Reutilizar módulos y dependencias actuales                              | Respeta el stack mínimo y reduce superficie de cambio; no se justifica ninguna dependencia adicional en la spec.                                                         | Añadir una biblioteca de estado, temporizadores o cursores; no aporta comportamiento requerido y exige justificación ausente.                |

## Estrategia de tests

**RF cubiertos: RF-1 a RF-7 y principios 3 a 5 de la constitución.**

Las reglas bajo `src/game` tendrán pruebas unitarias con Vitest, con horas controladas y sin renderizado. La presentación de puntero, marco, marcadores y texto de stamina se verificará manualmente, salvo las conversiones o adaptadores no triviales que ya tengan pruebas en la base existente.

| Grupo de pruebas             | Casos mínimos                                                                                                                                                                                                                                                                                      | RF cubiertos           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Modelo y creación de partida | Stamina inicial en 36; límites 0 y 36; valores persistentes válidos e inválidos para ambos acumuladores.                                                                                                                                                                                           | RF-3, RF-7             |
| Recuperación                 | Un punto a 15 s en `idle`; un punto a 30 s en `walking`; múltiples intervalos; pausa en acción y carrera; conservación al alternar `idle`/`walking`; prioridad de recuperación al cambiar de estado; llegada a 36 y descarte de progreso sobrante.                                                 | RF-3, RF-6             |
| Carrera y consumo            | Inicio con 13, bloqueo con 12, velocidad doble, consumo por cada segundo completo, fracción conservada, paso automático a `walking` al llegar a 12 y continuidad de posición a mitad de tramo.                                                                                                     | RF-4, RF-5             |
| Movimiento y órdenes         | Selección repetida sobre la referencia activa durante `walking`; repetición durante `running` sin cambios; redirección a referencia distinta desde posición continua; nueva ruta inicia caminando; orden sin ruta cancela ruta y queda `idle`.                                                     | RF-2, RF-4, RF-5       |
| Interacción contextual       | Referencia activa basada en objetivo; carrera al repetir sobre el objetivo; objetivo que deja de estar disponible durante carrera completa la ruta sin ejecutar acción; acciones existentes pausan recuperación.                                                                                   | RF-2, RF-4, RF-6       |
| Persistencia y restauración  | Versión 4 válida; restauración de stamina, progreso de recuperación y fracción de carrera; tiempo cerrado evaluado con cadencia `idle`; máximo de 36 reinicia progreso; restauración desde `running` en `idle`; datos ausentes, fuera de rango o incompatibles descartados con mensaje en español. | RF-3, RF-5, RF-6, RF-7 |
| Orden temporal               | Selección de carrera coincidente con recuperación de 12 a 13; pulsos grandes con varios hitos; llegada, consumo y agotamiento en el mismo pulso sin exceder distancia ni perder progreso.                                                                                                          | RF-4, RF-5, RF-6       |

La verificación manual cubrirá: puntero personalizado que reemplaza el cursor para ratón o lápiz; marco que sigue solo tiles del mapa; ausencia de ambos con toque; puntero sin marco fuera del mapa pero dentro del canvas; ocultación al salir del canvas; stamina visible en la parte superior; y marcadores distinguibles y actualizados al caminar, correr, redirigir, cancelar o llegar. No se añadirán pruebas de JSX, formas, colores ni renderizado trivial.
