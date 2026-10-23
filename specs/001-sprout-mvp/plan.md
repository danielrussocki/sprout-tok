# Plan técnico: prototipo inicial de Sprout Tok

## Alcance y trazabilidad

| Parte                                                                          | RF cubiertos                                   |
| ------------------------------------------------------------------------------ | ---------------------------------------------- |
| Mundo cuadriculado, rutas, destinos, objetivos y parcelas válidas para árboles | RF-1, RF-2, RF-3, RF-8                         |
| Acciones, mutaciones de granja y generación de árboles                         | RF-3, RF-4, RF-5, RF-6, RF-7, RF-8             |
| Movimiento continuo, renderizado e interacción                                 | RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8 |
| Guardado local, restauración y tiempo real                                     | RF-5, RF-6, RF-8 y requisitos no funcionales   |
| Pruebas de reglas y verificación visual del desplazamiento                     | RF-1 a RF-8                                    |

## Estructura de módulos

| Módulo                   | Responsabilidad                                                                                                                                                                                                                       | RF cubiertos                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `src/game/model.ts`      | Tipos del estado, coordenadas de parcela y continuas, direcciones, objetivos, acciones, movimiento transitorio, inventario y marcas de tiempo de crecimiento y generación de árboles.                                                 | RF-1 a RF-8                                  |
| `src/game/world.ts`      | Creación de partida, límites, transitabilidad, ocupación, distribución 40/30/20/10 de cultivos iniciales y validación de parcelas candidatas para árboles, incluida la exclusión ortogonal y diagonal respecto de tierra de cultivo.  | RF-1, RF-8                                   |
| `src/game/navigation.ts` | Validación de destinos, avance continuo y generación de rutas por parcelas transitables desde la posición actual, selección de parcela adyacente más cercana y desempate norte, este, sur, oeste.                                     | RF-1, RF-2, RF-3                             |
| `src/game/commands.ts`   | Traducción de una intención de clic/toque a movimiento, interacción, mensaje o ignorar; actualiza el movimiento hasta la hora recibida antes de sustituir una orden.                                                                  | RF-1, RF-2, RF-3                             |
| `src/game/actions.ts`    | Inicio, cancelación y finalización diferida de labranza, tala y riego; al terminar una tala válida añade exactamente un tronco al inventario y al terminar el riego inicia la espera de crecimiento. Plantación y cosecha inmediatas. | RF-3 a RF-7                                  |
| `src/game/time.ts`       | Cálculo con tiempo real de acciones, vencimiento de esperas de crecimiento, desaparición y generación periódica de árboles, incluidos los intervalos vencidos al restaurar.                                                           | RF-3, RF-5, RF-6, RF-8                       |
| `src/game/messages.ts`   | Mensajes de resultado para el jugador, todos en español.                                                                                                                                                                              | RF-3, RF-5, RF-6, RF-7                       |
| `src/game/save.ts`       | Serialización versionada, lectura segura, descarte de datos inválidos y normalización a `idle`, incluido el inventario con troncos y las marcas de espera de crecimiento y de generación de árboles.                                  | RF-5, RF-6, RF-8 y requisitos no funcionales |
| `src/ui/GameScreen.tsx`  | Orquesta el estado de juego, despacha intenciones y pulsos con la hora actual a las reglas, y solicita guardado tras cada cambio persistente. No contiene reglas.                                                                     | RF-1 a RF-8                                  |
| `src/ui/FarmScene.tsx`   | Representa mapa, personaje, árboles y cultivos con la posición continua calculada por las reglas; muestra el indicador circular verde derivado de la regabilidad o cosechabilidad y convierte clic/toque en una intención.            | RF-1 a RF-8                                  |
| `src/ui/StatusPanel.tsx` | Muestra inventario, estado del personaje y mensajes en español.                                                                                                                                                                       | RF-3, RF-5, RF-6, RF-7                       |

Los módulos bajo `src/game` solo reciben datos y devuelven datos nuevos o resultados; no acceden al renderizado, eventos del navegador ni almacenamiento. El avance y la redirección del movimiento son reglas puras en `src/game`; la capa `src/ui` presenta el estado y envía intenciones o pulsos con hora, cumpliendo la separación exigida por la constitución.

## Modelo de datos

**RF cubiertos: RF-1 a RF-8 y requisitos no funcionales de guardado.**

El guardado contiene únicamente datos persistentes. Una acción activa no se guarda: al restaurar una partida el personaje queda en `idle`, tal como exige la spec. Las marcas de tiempo son milisegundos Unix para que los temporizadores continúen mientras el juego está cerrado.

```json
{
  "version": 3,
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

- Una parcela con cultivo está ocupada; un árbol ocupa su posición y no es transitable.
- Un cultivo en etapa 4 es cosechable y no regable; un cultivo plantado inicia en etapa 1.
- `growthReadyAt` es `null` para un cultivo regable o cosechable y contiene la hora Unix en que debe crecer para un cultivo en espera. Al terminar un riego válido se guarda como la hora de finalización más un minuto real.
- Al alcanzar `growthReadyAt`, el cultivo avanza exactamente una etapa y la marca se elimina. Si alcanza la etapa 4 queda cosechable; si no, queda regable de inmediato. Un cultivo en etapa 4 no es regable.
- El indicador circular verde no se persiste: la interfaz lo deriva del estado normalizado. Se muestra para un cultivo regable o cosechable y se omite cuando `growthReadyAt` aún no ha vencido.
- Un árbol `reduced` desaparece cuando `now` alcanza cinco minutos desde `reducedAt`.
- Al finalizar una acción de tala válida, el árbol pasa a `reduced` y el inventario aumenta exactamente una unidad de `log`. Una tala cancelada o dirigida a un árbol no disponible no modifica el inventario.
- La generación de árboles guarda `lastTreeGenerationAttemptAt`. Al cumplirse cada intervalo de cinco minutos reales se registra el intento, haya o no una parcela válida, para que el siguiente intento ocurra cinco minutos después.
- Al restaurar la partida, se procesan todos los intervalos de generación de árboles vencidos en tiempo real, en orden cronológico, hasta alcanzar `now`. Cada intervalo aplica el máximo de cinco árboles y las condiciones de parcela válidas vigentes en ese intento.
- Una parcela candidata para un árbol debe ser césped, no puede ser adyacente ortogonal ni diagonalmente a tierra de cultivo y debe mantener las conexiones existentes entre parcelas transitables. Esta última condición se verifica comparando la alcanzabilidad del grafo de parcelas transitables antes y después de tratar la parcela candidata como ocupada por un árbol.
- El límite de cinco cuenta todos los árboles existentes, vivos o reducidos. Los árboles creados por la generación periódica siempre se registran con estado vivo y pueden ocupar parcelas adyacentes a otros árboles si cada parcela es válida.
- La posición lógica del personaje solo avanza al completar cada parcela de la ruta. Durante `walking`, el estado transitorio de movimiento conserva la posición continua actual, el tramo activo, la ruta restante y la hora de su último avance; no se guarda.
- Una nueva selección primero avanza ese estado transitorio hasta `now` y usa la posición continua resultante como origen de la nueva ruta. El primer tramo de la ruta reemplazada empieza exactamente allí y los siguientes recorren parcelas consecutivas, sin teletransporte, regreso ni ajuste al centro de una parcela.
- El estado transitorio de movimiento, el estado visible de acción y el destino pendiente se reinician a `idle` al restaurar.

## Algoritmo en pseudocódigo

**RF cubiertos: RF-1 a RF-8.**

```text
AL RECIBIR_INTENCIÓN_SELECCION(coordenada, ahora):
  avanzarMovimientoHasta(estado, ahora)
  normalizarTemporizadores(estado, ahora)
  cancelarAcciónActivaYDestinoPendiente(estado)

  objetivo = buscarObjetivoEn(coordenada)
  SI objetivo no existe:
    SI coordenada está dentro del mapa Y es transitable:
      prepararRutaDesdePosiciónContinuaActualHacia(coordenada)
      estadoPersonaje = walking
    SI NO:
      estadoPersonaje = idle
      mostrarMensajeEspañolDeDestinoInválido()
    TERMINAR

  SI objetivo es árbol reducido:
    mostrarMensajeEspañolDeAcciónNoDisponible()
    estadoPersonaje = idle
    TERMINAR

  parcela = elegirParcelaAdyacenteTransitableMásCercana(objetivo)
  SI parcela no existe:
    mostrarMensajeEspañolDeObjetivoInalcanzable()
    estadoPersonaje = idle
    TERMINAR

  prepararRutaDesdePosiciónContinuaActualHacia(parcela) si no está allí
  orientarHacia(objetivo)
  AL ESTAR_ADYACENTE_Y_ORIENTADO:
    SI objetivo es parcela labrada vacía: crearCultivoEnEtapa1SinConsumirInventario(); TERMINAR
    SI objetivo es cultivo cosechable: eliminarCultivoYSumarUnaUnidadAlInventario(); TERMINAR
    SI objetivo es tierra sin labrar: iniciarAcción(tilling dirt, 3 segundos)
    SI objetivo es árbol disponible: iniciarAcción(chopping, 3 segundos)
    SI objetivo es cultivo regable: iniciarAcción(watering, 3 segundos)
    EN OTRO CASO: mostrarMensajeEspañolDeAcciónNoDisponible(); estadoPersonaje = idle

AL FINALIZAR_ACCIÓN(activa, ahora):
  SI activa no coincide con la acción aún activa O el objetivo ya no es válido:
    estadoPersonaje = idle; TERMINAR
  SI activa es tilling dirt: marcarParcelaComoLabrada()
  SI activa es chopping: marcarÁrbolComoReducido(ahora); sumarExactamenteUnTroncoAlInventario()
  SI activa es watering: guardarCrecimientoPendientePara(ahora + 1 minuto)
  estadoPersonaje = idle

AL AVANZAR_MOVIMIENTO_HASTA(ahora):
  calcular posición continua desde el tramo activo y ahora
  SI no se alcanza la siguiente parcela: TERMINAR
  confirmarLaSiguienteParcelaDeLaRutaComoPosiciónLógica()
  SI quedan parcelas en la ruta:
    mantener estadoPersonaje = walking
  SI NO:
    completarLlegadaYResolverInteracciónPendienteSiExiste()

AL NORMALIZAR_TEMPORIZADORES(ahora):
  avanzarUnaEtapaYCerrarLaEsperaDeCadaCultivoConCrecimientoVencido(ahora)
  eliminarÁrbolesReducidosCuyoTiempoDeDesapariciónVenció(ahora)
  MIENTRAS ahora alcanza el siguiente intervalo de generación de árboles:
    registrarLaHoraDelIntentoDeGeneración()
    SI existen menos de cinco árboles vivos o reducidos:
      candidatas = obtenerParcelasDeCéspedQueNoSonAdyacentesOrtogonalNiDiagonalmenteATierraDeCultivo()
      válidas = candidatas que preservan las conexiones transitables al ocuparlas con un árbol
      SI válidas no está vacía:
        crearÁrbolVivoEnUnaParcelaAleatoria(válidas)

AL RESTAURAR_PARTIDA(datos, ahora):
  SI los datos no cumplen el esquema y la versión esperada:
    crearPartidaNueva(); mostrarMensajeEspañolDeGuardadoDescartado()
  SI NO:
    cargarDatos(); cancelarAcciónActivaYDestinoPendiente(); normalizarTemporizadores(ahora)
```

`elegirParcelaAdyacenteTransitableMásCercana` evalúa norte, este, sur y oeste; elige la de menor distancia de ruta y conserva ese orden como desempate. Una ruta se recorre por parcelas consecutivas; cada llegada confirmada permite comenzar el siguiente tramo o resolver la interacción pendiente. Al sustituir una ruta a mitad de tramo, el nuevo primer tramo parte de la posición continua calculada hasta ese instante y se enlaza con la ruta por parcelas sin modificar esa posición. El tiempo se consulta en cada pulso de movimiento, al procesar una intención, al terminar una acción y al restaurar la partida. En cada normalización, cada cultivo cuya espera haya vencido crece una única etapa y deja de estar en espera; no se encadenan crecimientos sin un nuevo riego válido. La generación recibe un generador aleatorio como dato, filtra todas las candidatas antes de escoger una y no crea ningún árbol si el límite se alcanzó o no hay candidatas válidas.

## Contrato entre lógica e interfaz

**RF cubiertos: RF-1 a RF-8.**

| Entrada de la interfaz                                                | Respuesta de la lógica                                                                                                                                                       | Resultado visible                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `select(position, now)` por clic o toque                              | Avanza el movimiento hasta `now`; después devuelve estado actualizado, movimiento o interacción pendiente, y mensaje opcional.                                               | Personaje camina, actúa, queda `idle` o se muestra un mensaje; al redirigirlo no salta al centro de una parcela.                                                                                                                                            |
| `advanceMovement(now)` en cada fotograma mientras hay un tramo activo | Posición continua actualizada, siguiente tramo o posible comienzo de acción.                                                                                                 | El personaje se ve recorrer el tramo de forma continua y no aparece directamente en el destino.                                                                                                                                                             |
| `completeAction(actionId, now)` tras tres segundos                    | Estado actualizado; efecto aplicado o acción cancelada. Una tala válida reduce el árbol y añade exactamente un tronco; el riego crea una espera de crecimiento de un minuto. | Tierra labrada o árbol reducido e inventario actualizado; el cultivo permanece en su etapa y deja de mostrar el indicador hasta que venza la espera.                                                                                                        |
| `advanceTime(now, random)` en cada pulso y al restaurar               | Normaliza esperas de crecimiento, desapariciones y todos los intervalos vencidos de generación; devuelve el estado persistente actualizado.                                  | Un cultivo cuyo minuto venció crece una etapa y vuelve a mostrar el indicador verde para riego o cosecha; los árboles nuevos aparecen vivos solo en césped válido, sin bloquear accesos ni quedar adyacentes ortogonal o diagonalmente a tierra de cultivo. |
| `restore(savedData, now)` al abrir el juego                           | Partida válida normalizada o partida nueva con mensaje.                                                                                                                      | Mapa e inventario restaurados; personaje en `idle`.                                                                                                                                                                                                         |

La interfaz debe usar un único tipo de evento de puntero para unificar clic y toque. Cada celda u objeto interactuable comunica sus coordenadas a la lógica; la lógica decide el objetivo, no el renderizador.

## Decisiones técnicas

**RF cubiertos: RF-1 a RF-8 y requisitos no funcionales.**

| Decisión                                                                              | Justificación                                                                                                                                                                                                                                                                                            | Alternativa descartada                                                                                                                |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Cuadrícula discreta para el mapa y el personaje                                       | Hace verificables los límites, la transitabilidad, la adyacencia de un bloque y el desempate de rutas.                                                                                                                                                                                                   | Posicionamiento libre por píxeles; añade ambigüedad en alcance y colisiones para el MVP.                                              |
| Reglas puras con `now` y generador aleatorio recibidos como datos                     | Permite probar temporizadores, distribuciones y mutaciones de manera determinista.                                                                                                                                                                                                                       | Leer reloj y aleatoriedad directamente en componentes; acopla las reglas y dificulta las pruebas.                                     |
| Movimiento transitorio continuo gobernado por reglas puras y ruta lógica por parcelas | El estado de movimiento conserva una posición continua y se avanza con `now` dentro de `src/game`; una nueva orden se procesa desde esa posición exacta y la ruta restante continúa parcela por parcela. PixiJS solo representa el resultado, por lo que no hay salto ni regreso al centro al redirigir. | Interpolar solo en PixiJS desde la última parcela lógica; al sustituir la orden obliga a reiniciar el tramo visual y contradice RF-2. |
| Una acción transitoria identificada por objetivo y hora de finalización               | Asegura los tres segundos, permite cancelarla por una orden nueva y evita aplicar su efecto anticipadamente.                                                                                                                                                                                             | Aplicar la mutación al iniciar la animación; contradice la spec y no permite cancelación limpia.                                      |
| Marcas de tiempo absolutas persistidas                                                | Mantiene la espera de un minuto antes del crecimiento y los cinco minutos del árbol aunque la aplicación esté cerrada.                                                                                                                                                                                   | Contadores que avanzan solo mientras la aplicación está abierta; incumple RF-5 y RF-6.                                                |
| Indicador derivado del estado normalizado                                             | La regla pura determina si el cultivo es regable, está en espera o es cosechable; la escena solo muestra el círculo verde cuando corresponde, sin duplicar ni persistir estado visual.                                                                                                                   | Guardar o decidir el indicador en React/PixiJS; duplicaría el estado y mezclaría reglas con presentación.                             |
| Generación por intervalos absolutos y procesados en orden                             | Persiste la hora del último intento y procesa cada intervalo vencido, incluso tras cerrar el juego. Registrar también los intentos fallidos conserva la cadencia de cinco minutos acordada.                                                                                                              | Reintentar en cada pulso tras un fallo; generaría un árbol inmediatamente cuando cambie el mapa y rompería la cadencia.               |
| Validación de conectividad y entorno antes de crear un árbol                          | Un recorrido del grafo de parcelas transitables comprueba que ocupar una candidata de césped no elimina conexiones existentes; el filtro de las ocho parcelas circundantes excluye la adyacencia ortogonal y diagonal a tierra de cultivo.                                                               | Elegir cualquier césped libre; puede cerrar pasos o generar junto a tierra de cultivo, incluso en diagonal, incumpliendo RF-8.        |
| Guardado local versionado y validado                                                  | La versión 3 incorpora el inventario de troncos además de la hora de crecimiento pendiente, cumple la constitución y permite descartar guardados incompatibles sin bloquear la partida ni añadir dependencias.                                                                                           | Backend, base de datos o biblioteca de persistencia; quedan fuera del stack y del alcance.                                            |
| PixiJS para escena e interacción; React para composición y paneles                    | Reutiliza las dependencias existentes y separa la representación del dominio. Las zonas interactivas usan eventos de puntero estáticos y áreas de impacto rectangulares por celda.                                                                                                                       | Añadir un motor, biblioteca de estado o sistema de física; no aporta valor al MVP y aumenta la carga de mantenimiento.                |
| Formas y colores simples para el prototipo                                            | Permite hacer distinguibles personaje, tierra, árboles, cultivos y estados sin depender de assets nuevos.                                                                                                                                                                                                | Spritesheets y animaciones detalladas; están fuera de alcance.                                                                        |

## Estrategia de tests

**RF cubiertos: RF-1 a RF-8 y principio 4 de la constitución.**

Se crearán pruebas unitarias con Vitest para todos los módulos bajo `src/game`. Usarán hora y aleatoriedad controladas; no requerirán renderizado ni probarán JSX o gráficos triviales.

| Grupo de pruebas      | Casos mínimos                                                                                                                                                                                                                                                                                                                                                                                                         | RF cubiertos           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Mundo y navegación    | Límites, terreno transitable, árboles/cultivos no transitables, objetivo reconocido, distribución inicial 40/30/20/10, selección de adyacente más cercana y desempate N/E/S/O.                                                                                                                                                                                                                                        | RF-1, RF-3             |
| Movimiento y órdenes  | Destino vacío válido, destino inválido, ruta por parcelas consecutivas, llegada a `idle` solo al completar la ruta, sustitución por la última orden, redirección a mitad de tramo desde la posición continua sin salto ni ajuste al centro, clic repetido sobre el mismo destino y clic y toque con la misma intención.                                                                                               | RF-1, RF-2             |
| Acciones              | Inicio solo desde adyacencia orientada, tres segundos sin mutación previa, efecto al finalizar, cancelación por orden nueva, objetivo retirado antes de finalizar.                                                                                                                                                                                                                                                    | RF-3, RF-4, RF-5, RF-6 |
| Labranza y plantación | Tierra queda labrada, plantación en parcela vacía, bloqueo de parcela ocupada, plantación ilimitada sin consumo de inventario.                                                                                                                                                                                                                                                                                        | RF-4                   |
| Tala                  | Reducción tras acción y suma de exactamente un tronco solo al finalizar una tala válida; ausencia de troncos antes de finalizar, tras cancelarla, o al ignorar un árbol reducido; desaparición a los cinco minutos exactos y tras restaurar.                                                                                                                                                                          | RF-5                   |
| Riego y crecimiento   | El riego finalizado inicia una espera sin avance inmediato; bloqueo durante la espera; avance de una sola etapa al minuto exacto; tres esperas de cultivo plantado; esperas restantes de cada etapa inicial; bloqueo de riego en etapa 4; restauración antes y después del vencimiento; e indicador derivado visible para cultivos regables o cosechables y ausente durante la espera.                                | RF-6                   |
| Cosecha               | Solo etapa 4, retirada del cultivo, suma de una unidad, inventario sin límite y sin avance de cultivo no cosechable.                                                                                                                                                                                                                                                                                                  | RF-7                   |
| Generación de árboles | Intervalo de cinco minutos exacto, elección aleatoria controlada entre candidatas, árbol creado vivo, límite que cuenta vivos y reducidos, adyacencia entre árboles permitida, exclusión de parcelas ortogonal y diagonalmente adyacentes a tierra de cultivo, conservación de conexiones transitables, intento fallido que espera otros cinco minutos y procesamiento de todos los intervalos vencidos al restaurar. | RF-8                   |
| Guardado              | Versión 3 válida, conservación de mapa, inventario incluidos los troncos y marcas de tiempo incluida la hora de crecimiento pendiente y la del último intento de generación, crecimiento aplicado al restaurar si la espera venció, reinicio a `idle`, datos inválidos o incompatibles descartados y mensaje en español.                                                                                              | RF-5, RF-6, RF-8       |

La verificación manual confirma que el mapa y estados son distinguibles, que un toque y un clic despachan la misma intención, que los mensajes están en español y que, durante cada tramo de una ruta, el personaje se ve en posiciones intermedias en vez de aparecer directamente en el destino. También confirma que redirigirlo durante un tramo, incluso varias veces al mismo destino, conserva la posición visible del instante de la última orden sin regreso ni ajuste al centro de una parcela. No se añadirán pruebas de presentación trivial.
