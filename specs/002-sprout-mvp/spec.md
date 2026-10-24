# Spec: segundo MVP de Sprout Tok

## Contexto y objetivo

El primer MVP validó el ciclo básico de granja, el desplazamiento contextual y la persistencia local. Este segundo MVP debe mejorar la legibilidad de la interacción sobre el mapa y añadir una decisión de movilidad: correr a cambio de stamina.

El objetivo es que la persona jugadora pueda identificar con precisión el tile al que apunta, entender el recorrido activo del personaje y decidir cuándo gastar stamina para llegar antes a un destino. La stamina debe ser un recurso visible, limitado y recuperable con el paso del tiempo.

## Usuarios

- Persona que juega el prototipo y necesita interpretar de forma inmediata qué tile está señalando y hacia dónde se dirige el personaje.
- Persona que prueba la movilidad y necesita decidir de forma comprensible entre caminar sin coste y correr con stamina.

## Historias de usuario

- Como jugador, quiero ver un puntero propio del juego dentro del mapa, para saber con precisión dónde estoy apuntando.
- Como jugador, quiero que el tile bajo el puntero tenga un marco, para reconocer el objetivo potencial antes de seleccionarlo.
- Como jugador, quiero ver marcadores sobre los tiles del recorrido pendiente, para entender hacia dónde se dirige mi personaje.
- Como jugador, quiero ver mi stamina en la parte superior del mapa, para saber si puedo correr.
- Como jugador, quiero iniciar una carrera mediante un segundo clic o toque sobre mi destino activo, para decidir cuándo llegar más rápido.
- Como jugador, quiero que la carrera consuma stamina y que esta se recupere con el tiempo, para que correr sea una decisión limitada y predecible.

## Requisitos funcionales

### RF-1. Puntero y tile bajo hover

El sistema deberá proporcionar feedback visual del puntero de ratón o lápiz dentro del canvas y del tile actualmente señalado.

- **Criterio de aceptación:** Cuando un puntero de ratón o lápiz esté sobre el canvas, el sistema deberá mostrar un puntero visual personalizado en la posición del puntero y deberá reemplazar visualmente el cursor habitual.
- **Criterio de aceptación:** Cuando un puntero de ratón o lápiz señale un tile dentro del mapa, el sistema deberá mostrar un marco alrededor de ese tile.
- **Criterio de aceptación:** Mientras el puntero permanezca sobre un mismo tile, el marco deberá mantenerse sobre ese tile.
- **Criterio de aceptación:** Cuando el puntero pase de un tile a otro, el sistema deberá retirar el marco anterior y mostrarlo alrededor del nuevo tile señalado.
- **Criterio de aceptación:** Cuando el puntero deje de señalar un tile dentro del mapa, el sistema no deberá mostrar un marco de hover sobre un tile.
- **Criterio de aceptación:** Cuando un puntero de ratón o lápiz permanezca dentro del canvas, pero fuera del mapa, el sistema deberá mantener el puntero personalizado y no deberá mostrar un marco de hover.
- **Criterio de aceptación:** Cuando un puntero de ratón o lápiz salga del canvas, el sistema deberá ocultar el puntero personalizado y deberá volver a mostrar el cursor habitual.
- **Criterio de aceptación:** Cuando la interacción se realice solo mediante toque, el sistema no deberá mostrar el puntero personalizado ni un marco de hover.
- **Criterio de aceptación:** El puntero personalizado y el marco de hover no deberán alterar el mapa, el destino, las acciones ni la stamina hasta que la persona jugadora emita una selección válida.

### RF-2. Feedback del recorrido activo

El sistema deberá hacer visible el recorrido pendiente cuando el personaje se esté desplazando.

- **Criterio de aceptación:** Cuando el personaje inicie un desplazamiento hacia un destino o hacia un objetivo contextual, el sistema deberá mostrar un marcador en cada tile pendiente de la ruta, incluido el destino final de movimiento.
- **Criterio de aceptación:** Mientras el personaje avance por la ruta, el sistema deberá retirar los marcadores de los tiles ya alcanzados y conservar los de los tiles pendientes.
- **Criterio de aceptación:** Cuando el personaje reciba una nueva orden de desplazamiento válida, el sistema deberá reemplazar los marcadores del recorrido anterior por los correspondientes a la última orden.
- **Criterio de aceptación:** Cuando el personaje reciba una orden de desplazamiento hacia un destino u objetivo sin ruta válida, el sistema deberá cancelar el recorrido activo, retirar sus marcadores y quedar `idle`.
- **Criterio de aceptación:** Cuando el personaje llegue a su destino, inicie una acción contextual o quede sin una ruta activa, el sistema no deberá mostrar marcadores de recorrido.
- **Criterio de aceptación:** Los marcadores de recorrido deberán ser distinguibles del marco de hover, del puntero personalizado y de los indicadores existentes de los cultivos.

### RF-3. Stamina visible y acotada

El sistema deberá mantener y mostrar la stamina del personaje como un valor entero entre 0 y 36.

- **Criterio de aceptación:** Cuando comience una partida nueva, el sistema deberá establecer la stamina en 36.
- **Criterio de aceptación:** En todo momento, el sistema deberá conservar la stamina dentro del rango inclusivo de 0 a 36.
- **Criterio de aceptación:** Mientras el jugador observe el canvas, el sistema deberá mostrar el valor actual de stamina en su parte superior.
- **Criterio de aceptación:** Cuando la stamina cambie, el valor visible deberá actualizarse para reflejar el nuevo valor.
- **Criterio de aceptación:** Cuando la stamina alcance 0, el sistema no deberá reducirla por debajo de 0.
- **Criterio de aceptación:** Cuando la stamina alcance 36, el sistema no deberá aumentarla por encima de 36.

### RF-4. Inicio y velocidad de carrera

El sistema deberá permitir convertir un desplazamiento activo en carrera mediante una nueva selección sobre la misma referencia activa, siempre que haya stamina suficiente. La referencia activa será el tile seleccionado para un destino vacío o el objetivo originalmente seleccionado para una interacción contextual.

- **Criterio de aceptación:** Cuando el personaje esté caminando y el jugador haga una nueva selección sobre la misma referencia activa con 13 o más puntos de stamina, el sistema deberá cambiar el estado de desplazamiento a `running`.
- **Criterio de aceptación:** Mientras el personaje esté en `running`, el sistema deberá desplazarlo al doble de la velocidad de `walking` sobre la misma ruta pendiente.
- **Criterio de aceptación:** Cuando el jugador seleccione una referencia distinta de la activa durante `walking`, el sistema deberá sustituir la orden conforme a las reglas de redirección existentes y el nuevo desplazamiento deberá comenzar caminando.
- **Criterio de aceptación:** Cuando el jugador haga una nueva selección sobre la referencia activa con menos de 13 puntos de stamina, el sistema deberá mantener el desplazamiento en `walking`.
- **Criterio de aceptación:** Cuando el personaje esté en `running` y el jugador haga una nueva selección sobre la misma referencia activa, el sistema deberá mantener sin cambios la carrera, la ruta y la stamina.
- **Criterio de aceptación:** Cuando no exista un desplazamiento activo, un clic o toque no deberá iniciar `running` por sí solo.
- **Criterio de aceptación:** Cuando el personaje complete su ruta en `running`, el sistema deberá abandonar `running` y resolver la llegada conforme a las reglas existentes.

### RF-5. Consumo de stamina y transición por agotamiento

El sistema deberá consumir stamina durante la carrera y forzar la continuación a pie al quedar por debajo del umbral mínimo.

- **Criterio de aceptación:** Mientras el personaje permanezca en `running`, el sistema deberá consumir 1 punto de stamina por cada segundo real completo de carrera.
- **Criterio de aceptación:** Cuando el consumo de carrera reduzca la stamina de 13 a 12, el sistema deberá cambiar automáticamente de `running` a `walking` y conservar la ruta pendiente.
- **Criterio de aceptación:** Cuando la stamina sea inferior a 13, el sistema no deberá permitir iniciar ni mantener `running`.
- **Criterio de aceptación:** Cuando la transición automática de `running` a `walking` ocurra a mitad de un tramo, el personaje deberá continuar desde su posición visible actual, sin salto, regreso ni ajuste al centro de un tile.
- **Criterio de aceptación:** Cuando una carrera termine antes de completar un segundo real adicional, el sistema no deberá descontar un punto de stamina por ese segundo incompleto.
- **Criterio de aceptación:** Cuando una carrera termine antes de completar el siguiente segundo real, el sistema deberá conservar la fracción de segundo de carrera acumulada y sumarla al tiempo de la siguiente carrera hasta completar un segundo de consumo.

### RF-6. Recuperación de stamina

El sistema deberá recuperar stamina gradualmente con el paso del tiempo mientras el personaje esté `idle` o `walking`.

- **Criterio de aceptación:** Cuando el personaje esté `idle`, hayan transcurrido 15 segundos reales completos de recuperación acumulada y la stamina sea menor que 36, el sistema deberá aumentar la stamina en exactamente 1 punto.
- **Criterio de aceptación:** Cuando el personaje esté `walking`, hayan transcurrido 30 segundos reales completos de recuperación acumulada y la stamina sea menor que 36, el sistema deberá aumentar la stamina en exactamente 1 punto.
- **Criterio de aceptación:** Mientras la stamina sea menor que 36 y transcurran múltiples intervalos completos en `idle` o `walking`, el sistema deberá recuperar exactamente 1 punto por cada intervalo completo aplicable, sin superar 36.
- **Criterio de aceptación:** Mientras el personaje esté `running` o realice una acción contextual, el sistema no deberá recuperar stamina.
- **Criterio de aceptación:** Cuando el personaje cambie entre `idle` y `walking` con tiempo parcial de recuperación acumulado, el sistema deberá conservar ese tiempo y evaluar la recuperación con la cadencia del estado nuevo.
- **Criterio de aceptación:** Cuando el personaje entre en `running` o inicie una acción contextual con tiempo parcial de recuperación acumulado, el sistema deberá pausarlo y conservarlo hasta que el personaje vuelva a estar `idle` o `walking`.
- **Criterio de aceptación:** Cuando un intervalo de recuperación se complete exactamente al cambiar entre `idle` y `walking`, el sistema deberá aplicar primero la recuperación con la cadencia del estado anterior y después el cambio de estado.
- **Criterio de aceptación:** Cuando la stamina sea 36, el sistema no deberá aumentar su valor por el transcurso del tiempo y deberá reiniciar el progreso parcial de recuperación acumulado.
- **Criterio de aceptación:** Cuando la stamina se recupere hasta 13 o más, el sistema deberá permitir volver a iniciar `running` mediante el segundo clic o toque definido.

### RF-7. Continuidad y persistencia de stamina

El sistema deberá conservar la stamina como parte del progreso del jugador y restaurarla de forma segura.

- **Criterio de aceptación:** Cuando el progreso se guarde correctamente, el sistema deberá incluir la stamina actual, el progreso parcial de recuperación y la fracción de segundo de carrera acumulada necesarios para aplicarlos conforme a esta spec.
- **Criterio de aceptación:** Cuando el progreso válido se restaure, el sistema deberá recuperar la stamina guardada, conservar los progresos parciales guardados y aplicar al tiempo que el juego estuvo cerrado la cadencia de `idle`, sin superar 36.
- **Criterio de aceptación:** Cuando el progreso guardado sea inválido, incompleto o incompatible respecto de la stamina, el sistema deberá descartarlo de forma segura, iniciar una partida nueva con stamina en 36 y comunicarlo al jugador en español.
- **Criterio de aceptación:** Cuando se restaure una partida durante un desplazamiento que estaba en `running`, el sistema no deberá restaurar al personaje en `running`; deberá conservar las reglas existentes de restauración del movimiento y aplicar únicamente la stamina que corresponda.

## Requisitos no funcionales

- Los nuevos elementos visuales deberán ser distinguibles entre sí y de los elementos ya existentes del mapa durante una prueba manual.
- Clic y toque deberán producir el mismo resultado para selección, redirección y activación de carrera cuando se apliquen sobre la misma referencia activa y en el mismo estado de juego. El feedback de hover deberá estar disponible solo para ratón o lápiz.
- La stamina, el consumo, la recuperación, el umbral de carrera y las transiciones entre caminar y correr deberán comportarse de forma determinista para una misma secuencia de entradas y tiempo transcurrido.
- El progreso deberá persistirse únicamente de forma local, mediante un guardado versionado y una restauración segura ante datos inválidos, incompletos o incompatibles.
- Los mensajes dirigidos al jugador deberán estar en español.
- La experiencia deberá conservar la continuidad visual ya definida: redirigir, iniciar carrera o detenerla por stamina insuficiente no deberá teletransportar al personaje ni ajustarlo al centro de un tile.
- Las reglas de stamina, consumo, recuperación, transiciones de movilidad y normalización temporal deberán ser independientes de la presentación y comportarse como funciones deterministas sobre los datos y el tiempo recibido.
- Las reglas nuevas de stamina, consumo, recuperación, persistencia y transiciones de movilidad deberán contar con pruebas unitarias; no se deberán exigir pruebas de presentación visual trivial.

## Casos límite

- El jugador hace una nueva selección sobre la referencia activa con exactamente 13 de stamina: la carrera debe iniciar y, tras un segundo real completo, debe continuar caminando con 12 de stamina si aún queda ruta.
- El jugador hace una nueva selección sobre la referencia activa con 12 o menos de stamina: debe conservarse `walking` y no debe descontarse stamina.
- La stamina se agota por debajo de 13 durante un tramo: el personaje debe pasar a caminar desde su posición continua actual y conservar el resto del recorrido.
- El personaje llega al destino antes de que se complete el siguiente segundo de carrera: no debe descontarse stamina por una fracción de segundo.
- El jugador redirige al personaje mientras corre: debe atenderse únicamente la nueva orden, los marcadores deben reemplazarse y el nuevo recorrido debe comenzar caminando desde la posición continua actual.
- El jugador repite clic o toque sobre el mismo destino después de que el personaje llegue: no debe reactivar una carrera inexistente; debe aplicarse el comportamiento normal de una nueva selección.
- El jugador repite una selección sobre la referencia activa mientras el personaje ya está en `running`: la carrera, la ruta y la stamina deben mantenerse sin cambios.
- El personaje pasa de `walking` a `idle` o viceversa antes de completar un intervalo de recuperación: debe conservarse el tiempo parcial y aplicarse la cadencia de 15 segundos en `idle` o de 30 segundos en `walking`.
- El personaje entra en `running` o inicia una acción contextual con tiempo parcial de recuperación: el progreso debe pausarse y conservarse hasta volver a `idle` o `walking`.
- El personaje deja `running` antes de completar un segundo de consumo: la fracción acumulada debe conservarse y aplicarse a la siguiente carrera, incluso después de cerrar y reabrir el juego.
- El personaje cambia entre `idle` y `walking` exactamente cuando vence una recuperación: debe aplicarse primero la recuperación del estado anterior.
- El personaje alcanza 36 de stamina antes o durante un intervalo de recuperación: no debe superar 36 y debe reiniciarse el tiempo parcial acumulado.
- Vencen varios intervalos de recuperación en un mismo pulso y uno lleva la stamina a 36: no deben aplicarse los intervalos restantes y debe reiniciarse el progreso de recuperación.
- El juego se cierra con stamina inferior a 36: al reabrir debe conservarse el progreso parcial de recuperación, aplicar todo el tiempo cerrado con cadencia de `idle` y no superar 36.
- El puntero de ratón o lápiz sale del canvas: no debe quedar un marco de hover fijado a un tile, debe ocultarse el puntero personalizado y debe volver a mostrarse el cursor habitual.
- El puntero de ratón o lápiz se sitúa dentro del canvas, pero fuera del mapa: debe mantenerse el puntero personalizado sin marco de hover.
- La interacción se realiza solo mediante toque: no deben mostrarse puntero personalizado ni marco de hover.
- El personaje se desplaza hacia un objetivo contextual: una nueva selección sobre el mismo objetivo originalmente seleccionado debe activar la carrera si se cumplen los requisitos de stamina.
- Una nueva selección para correr coincide exactamente con una recuperación que eleva la stamina de 12 a 13: debe aplicarse primero la recuperación y la carrera debe iniciar.
- Un objetivo contextual deja de estar disponible mientras el personaje corre hacia él: el personaje debe completar su ruta y, al llegar, no debe realizar la acción contextual.
- El jugador redirige al personaje hacia un destino u objetivo sin ruta válida: debe cancelarse el recorrido activo, retirarse sus marcadores y el personaje debe quedar `idle`.

## Fuera de alcance

- Controles de teclado, gestos adicionales o botones en pantalla para activar carrera.
- Estados de movilidad distintos de `walking` y `running`, como sigilo, cansancio, monturas o sprint ilimitado.
- Cambios a las reglas de labranza, plantación, tala, riego, crecimiento, cosecha o generación de árboles, salvo el desplazamiento necesario para llegar a un objetivo.
- Nuevos recursos, economía, herramientas, mejoras de stamina, consumibles o penalizaciones adicionales por agotamiento.
- Diseño artístico final, animaciones complejas, efectos de sonido y assets definitivos para el puntero, los marcos o los marcadores.
- Multijugador, sincronización remota o cualquier forma de almacenamiento no local.

## Criterios de finalización

- El canvas muestra un puntero personalizado y un marco que identifica el tile bajo hover, sin modificar el estado del juego por el mero movimiento del puntero.
- Un desplazamiento activo muestra marcadores en todos los tiles pendientes de su ruta y los actualiza conforme el personaje avanza, se redirige o llega.
- La stamina comienza en 36, siempre permanece entre 0 y 36 y se muestra en la parte superior del canvas.
- Un segundo clic o toque sobre el mismo destino de un personaje que camina activa `running` solo con 13 o más de stamina.
- `running` desplaza al personaje al doble de velocidad que `walking`, consume 1 punto por segundo real completo y pasa automáticamente a `walking` al bajar de 13 de stamina, sin discontinuidades visuales.
- La stamina recupera 1 punto por cada 15 segundos reales completos en `idle` y por cada 30 segundos reales completos en `walking`, sin exceder 36; no se recupera durante `running` ni acciones contextuales, donde conserva pausado su progreso parcial.
- La stamina y su recuperación se conservan al cerrar y reabrir el juego, y un guardado inválido se descarta de forma segura con un mensaje en español.
- Los casos límite definidos se comportan sin alterar indebidamente el mapa, las acciones, la ruta ni la stamina.

## Dudas abiertas

No hay dudas abiertas.
