# Spec: prototipo inicial de Sprout Tok

## Contexto y objetivo

Crear una experiencia jugable mínima de granja que permita comprobar que el personaje, el mapa y las acciones básicas se entienden mediante interacción directa.
El jugador debe desplazarse hacia un punto elegido y transformar el entorno al labrar, talar, regar, plantar y cosechar, con un crecimiento de cultivos que no pueda acelerarse con riegos consecutivos.

## Usuarios

- Persona que prueba el prototipo y aprende las acciones sin instrucciones extensas.
- Persona que valida que el ciclo básico de una granja resulta claro y responde a la interacción.

## Historias de usuario

- Como jugador, quiero tocar o hacer clic en un lugar para llevar al personaje allí, para explorar la granja de forma directa.
- Como jugador, quiero interactuar con tierra, árboles y plantas, para alterar la granja y comprobar las acciones disponibles.
- Como jugador, quiero plantar, regar y cosechar cultivos, para experimentar un ciclo básico de producción.
- Como jugador, quiero que los riegos repetidos no aceleren artificialmente un cultivo, para que el crecimiento tenga reglas comprensibles.
- Como jugador, quiero que aparezcan árboles nuevos sin cerrar caminos del mapa ni invadir mis cultivos, para que la granja cambie sin impedir mis acciones.

## Requisitos funcionales

### RF-1. Mapa y objetivos interactuables

El sistema deberá mostrar un mapa delimitado que contenga tierra cultivable, árboles y cultivos iniciales.

- **Criterio de aceptación:** Cuando el jugador seleccione un punto transitable dentro de los límites del mapa, incluida tierra cultivable, el sistema deberá aceptarlo como destino válido.
- **Criterio de aceptación:** Cuando el jugador seleccione un punto fuera de los límites del mapa o no transitable, el personaje no deberá salir del mapa ni desplazarse hacia ese punto.
- **Criterio de aceptación:** Cuando el jugador seleccione tierra, un árbol o una planta, el sistema deberá reconocerlo como objetivo interactuable.
- **Criterio de aceptación:** Cuando comience una partida nueva, los cultivos iniciales deberán aparecer en etapas aleatorias con probabilidades de 40 % para la etapa 1, 30 % para la etapa 2, 20 % para la etapa 3 y 10 % para la etapa 4.

### RF-2. Desplazamiento del personaje

El sistema deberá permitir al jugador seleccionar un destino mediante clic o toque para que el personaje se desplace hacia él.

- **Criterio de aceptación:** Cuando el jugador seleccione un destino válido sin objetivo interactuable, el personaje deberá abandonar `idle` y desplazarse hacia ese destino.
- **Criterio de aceptación:** Mientras el personaje se desplaza, el sistema deberá mostrar `walking`.
- **Criterio de aceptación:** Mientras el personaje se desplace entre su posición inicial y el destino, el sistema deberá actualizar su posición visual de forma continua a lo largo del recorrido, sin que aparezca directamente en el destino.
- **Criterio de aceptación:** Cuando el personaje alcance su destino o no tenga un destino válido, el sistema deberá mostrar `idle`.
- **Criterio de aceptación:** Cuando el jugador seleccione un nuevo destino u objetivo mientras el personaje se desplaza, el sistema deberá cancelar el destino y la interacción pendiente anteriores, atender únicamente la última selección y recalcular el recorrido desde la posición visual actual del personaje. El desplazamiento deberá continuar de forma continua, sin regresar ni ajustarse al centro de una parcela, y deberá conservar el avance parcela por parcela hasta el nuevo destino o la parcela adyacente al objetivo.

### RF-3. Interacción contextual

El sistema deberá iniciar una acción contextual cuando el jugador seleccione un objetivo interactuable y el personaje esté en una parcela adyacente, orientado hacia el objetivo.

- **Criterio de aceptación:** Cuando el jugador seleccione un objetivo interactuable sin estar en una parcela adyacente y orientado hacia él, el personaje deberá desplazarse a la parcela transitable adyacente más cercana y orientarse hacia el objetivo antes de iniciar la acción contextual.
- **Criterio de aceptación:** Cuando varias parcelas adyacentes transitables tengan la misma distancia mínima, el sistema deberá elegirlas en este orden fijo: norte, este, sur y oeste.
- **Criterio de aceptación:** Cuando el personaje inicie una acción contextual, no deberá iniciar otra hasta finalizar la actual.
- **Criterio de aceptación:** Cuando el jugador dé una nueva orden durante una acción contextual, el sistema deberá cancelarla, dejar el objetivo sin cambios y mostrar `idle`.
- **Criterio de aceptación:** Si el objetivo deja de estar disponible antes de ejecutar la acción, el sistema deberá cancelar la acción y mostrar `idle`.

### RF-4. Labranza y plantación

El sistema deberá permitir labrar tierra apta y plantar en tierra labrada para crear nuevos cultivos.

- **Criterio de aceptación:** Cuando el personaje actúe sobre tierra cultivable sin labrar, el sistema deberá mostrar `tilling dirt` durante tres segundos y, al terminar, la tierra deberá quedar labrada.
- **Criterio de aceptación:** Cuando el jugador seleccione tierra labrada sin cultivo y el personaje esté al alcance, el sistema deberá plantar un cultivo allí sin mostrar un estado de acción adicional.
- **Criterio de aceptación:** Cuando la tierra ya tenga un cultivo, el sistema no deberá plantar otro en la misma ubicación.
- **Criterio de aceptación:** Plantar deberá ser ilimitado y no deberá consumir elementos del inventario.

### RF-5. Tala de árboles

El sistema deberá permitir talar árboles para modificar el mapa.

- **Criterio de aceptación:** Cuando el personaje actúe sobre un árbol disponible, el sistema deberá mostrar `chopping` durante tres segundos y el árbol deberá reducirse visualmente al terminar la acción.
- **Criterio de aceptación:** Cuando hayan transcurrido cinco minutos reales desde que el árbol se redujo, incluso si el juego estuvo cerrado, el sistema deberá eliminarlo del mapa.
- **Criterio de aceptación:** Cuando el jugador seleccione un árbol que ya ha desaparecido, el sistema no deberá iniciar una acción de tala.
- **Criterio de aceptación:** Cuando el jugador seleccione un árbol reducido, el sistema deberá ignorar el intento de tala.

### RF-6. Riego y crecimiento

El sistema deberá permitir regar cultivos y hacerlos crecer bajo una limitación de tiempo por planta.

- **Criterio de aceptación:** Cuando el personaje actúe sobre un cultivo regable, el sistema deberá mostrar `watering` durante tres segundos y aplicar una única etapa visible de crecimiento al cultivo al finalizar la acción.
- **Criterio de aceptación:** Cuando un cultivo haya recibido riego, el sistema deberá ignorar riegos adicionales sobre ese mismo cultivo durante un minuto real, incluso si el juego estuvo cerrado.
- **Criterio de aceptación:** Cuando el jugador intente regar un cultivo durante su enfriamiento, el crecimiento del cultivo no deberá cambiar.
- **Criterio de aceptación:** Cuando un cultivo plantado complete tres riegos válidos, deberá alcanzar la etapa 4 y el sistema deberá marcarlo como cosechable.
- **Criterio de aceptación:** Cuando un cultivo inicial complete los riegos válidos necesarios para avanzar desde su etapa inicial hasta la etapa 4, el sistema deberá marcarlo como cosechable.
- **Criterio de aceptación:** Cuando un cultivo alcance la etapa 4, el sistema deberá ignorar intentos posteriores de regarlo.
- **Criterio de aceptación:** El crecimiento de un cultivo deberá ocurrir únicamente al completarse un riego válido.

### RF-7. Cosecha

El sistema deberá permitir cosechar un cultivo que haya alcanzado su estado cosechable.

- **Criterio de aceptación:** Cuando el jugador seleccione un cultivo cosechable y el personaje esté al alcance, el sistema deberá retirarlo de su parcela y añadir una unidad del cultivo al inventario, sin límite de capacidad ni estado de acción adicional.
- **Criterio de aceptación:** Cuando el jugador seleccione un cultivo que aún no sea cosechable, el sistema no deberá retirarlo ni avanzar su crecimiento.

### RF-8. Generación periódica de árboles

El sistema deberá generar árboles vivos de forma aleatoria en el mapa, sin impedir el acceso a sus zonas transitables ni ocupar el entorno de las tierras de cultivo.

- **Criterio de aceptación:** Cuando transcurran cinco minutos desde la última generación de árboles, el sistema deberá intentar generar un árbol nuevo.
- **Criterio de aceptación:** Cuando el sistema genere un árbol nuevo, deberá situarlo aleatoriamente en una parcela de césped.
- **Criterio de aceptación:** Cuando una parcela de césped candidata tenga una parcela de tierra de cultivo adyacente, el sistema no deberá generar un árbol en ella.
- **Criterio de aceptación:** Cuando una parcela de césped candidata impida que alguna zona transitable del mapa siga siendo accesible desde las demás zonas transitables, el sistema no deberá generar un árbol en ella.
- **Criterio de aceptación:** Cuando existan varias parcelas de césped válidas, el sistema podrá generar árboles en parcelas adyacentes entre sí.
- **Criterio de aceptación:** Cuando se genere un árbol nuevo, deberá estar vivo; el sistema no deberá generarlo reducido.
- **Criterio de aceptación:** Cuando el mapa ya contenga cinco árboles, vivos o reducidos, el sistema no deberá generar otro árbol.

## Requisitos no funcionales

- La interacción mediante clic y toque deberá ofrecer el mismo resultado para un mismo objetivo.
- El estado actual del personaje y los cambios de tierra, árboles y cultivos deberán ser distinguibles visualmente durante la prueba.
- El progreso del jugador, incluidos mapa, cultivos, árboles, inventario, enfriamientos y tiempos de desaparición, deberá conservarse en almacenamiento local mediante un guardado versionado al salir y volver a abrir el juego.
- Si el progreso guardado es inválido, incompleto o incompatible, el juego deberá descartarlo de forma segura, iniciar una partida nueva y comunicarlo al jugador en español.
- Los mensajes dirigidos al jugador deberán estar en español.

## Casos límite

- Seleccionar repetidamente, incluso sobre el mismo destino vacío, antes de llegar: solo deberá respetarse el último destino seleccionado y el personaje deberá continuar desde su posición visual actual, sin regresar ni ajustarse al centro de la parcela que transita.
- Seleccionar un objetivo no disponible, ocupado o inexistente: no deberá alterar el mapa ni iniciar una acción inválida.
- Intentar regar una planta durante su enfriamiento de un minuto: el intento se ignorará y no alterará su crecimiento.
- Seleccionar un cultivo en una parcela ya ocupada: no deberá crearse un cultivo adicional.
- Seleccionar fuera de los límites del mapa: el personaje deberá permanecer dentro de ellos.
- Intentar iniciar una acción desde una parcela no adyacente o sin estar orientado al objetivo: el personaje deberá acercarse y orientarse antes de actuar.
- Seleccionar un árbol reducido: el intento de tala deberá ignorarse.
- Regar exactamente al cumplirse un minuto desde el último riego válido: el nuevo riego deberá ser válido.
- Cerrar el juego durante una acción de tres segundos: al volver, la acción deberá estar cancelada, el objetivo sin cambios y el personaje en `idle`.
- No existir una parcela transitable adyacente a un objetivo: la interacción deberá ignorarse y deberá mostrarse un mensaje al jugador.
- Transcurrir cinco minutos cuando ya existan cinco árboles, incluidos árboles reducidos pendientes de desaparecer: no deberá generarse otro árbol.
- Transcurrir cinco minutos sin parcelas de césped válidas, porque todas son adyacentes a tierra de cultivo o bloquearían el acceso a una zona transitable: no deberá generarse un árbol.
- Generar un árbol junto a otro árbol cuando ambas parcelas cumplan las condiciones de generación: ambos árboles podrán permanecer adyacentes.

## Fuera de alcance

- Controles de teclado para el desplazamiento.
- El estado `running` y cualquier desplazamiento a velocidad de carrera.
- Apariencia detallada, animaciones finales, audio, economía, herramientas, enemigos, misiones y multijugador.
- Un ciclo agrícola más allá del crecimiento, plantación y cosecha básicos.

## Criterios de finalización

- El jugador puede mover al personaje con clic o toque dentro de un mapa delimitado.
- El jugador puede labrar, plantar, talar, regar y cosechar mediante objetivos contextuales válidos.
- La tala reduce árboles durante cinco minutos reales antes de eliminarlos, y el riego avanza una etapa del cultivo sin permitir avances repetidos durante un minuto real.
- El estado visible del personaje incluye `idle`, `walking`, `tilling dirt`, `chopping` y `watering`.
- Los efectos de labrar, talar y regar ocurren solo al finalizar sus tres segundos de acción; una nueva orden los cancela sin efecto.
- Los cultivos plantados pasan de la etapa 1 a la 4 con tres riegos válidos; los cultivos iniciales requieren los riegos restantes según su etapa inicial.
- Cosechar añade una unidad al inventario sin límite y plantar no consume inventario.
- Cada cinco minutos se intenta generar un árbol vivo en una parcela de césped válida, sin superar cinco árboles vivos o reducidos ni bloquear el acceso al mapa o las tierras de cultivo.
- Los casos límite definidos no alteran indebidamente el mapa ni el crecimiento de los cultivos.

## Dudas abiertas

No hay dudas abiertas.
