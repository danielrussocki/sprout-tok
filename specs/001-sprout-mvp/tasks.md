# Tareas: prototipo inicial de Sprout Tok

- [x] 01. Preparar la ejecución de pruebas unitarias con Vitest.
  - **RF:** RF-1 a RF-7.
  - **Hecho cuando:** el proyecto ejecuta todas las pruebas unitarias con un único comando documentado.

- [x] 02. Definir los tipos del dominio: coordenada, dirección, personaje, parcela, árbol, cultivo, inventario y acción transitoria.
  - **RF:** RF-1 a RF-7.
  - **Hecho cuando:** el estado del juego y sus entidades se pueden representar sin tipos implícitos ni datos de interfaz.

- [x] 03. Crear la función de partida nueva con un mapa delimitado y parcelas de tierra, césped y posiciones iniciales.
  - **RF:** RF-1.
  - **Hecho cuando:** una partida nueva devuelve un mapa con dimensiones, parcelas transitables y objetivos iniciales.

- [x] 04. Implementar la asignación aleatoria de etapas iniciales con probabilidades 40/30/20/10.
  - **RF:** RF-1.
  - **Hecho cuando:** con un valor aleatorio controlado se obtiene la etapa esperada en cada rango de probabilidad.

- [x] 05. Probar la creación de partida, los límites del mapa y la distribución de etapas iniciales.
  - **RF:** RF-1.
  - **Hecho cuando:** las pruebas cubren parcelas, límites y los cuatro rangos de distribución sin depender de aleatoriedad real.

- [x] 06. Implementar consultas puras de transitabilidad, ocupación y detección de objetivos por coordenada.
  - **RF:** RF-1.
  - **Hecho cuando:** la lógica distingue tierra transitable, posiciones bloqueadas por árboles o cultivos y objetivos interactuables.

- [x] 07. Probar las consultas de transitabilidad, ocupación y detección de objetivos.
  - **RF:** RF-1.
  - **Hecho cuando:** las pruebas verifican destinos válidos, inválidos, ocupados y objetivos tierra, árbol y cultivo.

- [x] 08. Implementar la validación de destinos vacíos dentro de los límites del mapa.
  - **RF:** RF-1, RF-2.
  - **Hecho cuando:** un destino transitable es aceptado y uno fuera de límites o no transitable se rechaza sin mover al personaje.

- [x] 09. Implementar la selección de parcela adyacente más cercana y el desempate norte, este, sur, oeste.
  - **RF:** RF-3.
  - **Hecho cuando:** la lógica devuelve la posición adyacente transitables más cercana o informa que no existe una.

- [x] 10. Probar navegación hacia objetivos, desempates y objetivos sin parcela adyacente válida.
  - **RF:** RF-3.
  - **Hecho cuando:** las pruebas cubren las cuatro direcciones, el orden de desempate y el caso inalcanzable.

- [x] 11. Implementar el estado transitorio de destino, orientación y movimiento `walking` del personaje.
  - **RF:** RF-2, RF-3.
  - **Hecho cuando:** el personaje pasa de `idle` a `walking`, llega al destino, se orienta al objetivo y vuelve a `idle`.

- [x] 12. Implementar la sustitución de una orden pendiente por la última selección del jugador.
  - **RF:** RF-2, RF-3.
  - **Hecho cuando:** una nueva selección descarta el destino y la interacción pendiente anteriores.

- [x] 13. Probar movimiento, llegada, orientación y sustitución de órdenes.
  - **RF:** RF-2, RF-3.
  - **Hecho cuando:** las pruebas confirman que solo la última orden modifica el destino o la interacción del personaje.

- [x] 14. Implementar el ciclo genérico de acciones de tres segundos, con identificador de acción y cancelación segura.
  - **RF:** RF-3, RF-4, RF-5, RF-6.
  - **Hecho cuando:** una acción no aplica cambios antes de tres segundos y una orden nueva la cancela sin mutar el objetivo.

- [x] 15. Probar el ciclo de acciones, la cancelación y la finalización obsoleta.
  - **RF:** RF-3, RF-4, RF-5, RF-6.
  - **Hecho cuando:** las pruebas cubren acción en curso, cancelación, objetivo retirado y finalización con identificador inválido.

- [x] 16. Implementar la labranza de tierra cultivable sin labrar al finalizar la acción.
  - **RF:** RF-4.
  - **Hecho cuando:** la parcela solo queda labrada tras completar una acción válida de tres segundos.

- [x] 17. Implementar la plantación inmediata en tierra labrada vacía.
  - **RF:** RF-4.
  - **Hecho cuando:** se crea un cultivo en etapa 1 sin consumir inventario y se rechaza una parcela ya ocupada.

- [x] 18. Probar labranza y plantación.
  - **RF:** RF-4.
  - **Hecho cuando:** las pruebas verifican el retraso de labranza, la plantación ilimitada y la protección contra doble ocupación.

- [x] 19. Implementar la tala que reduce un árbol al finalizar la acción.
  - **RF:** RF-5.
  - **Hecho cuando:** un árbol disponible pasa a reducido solo tras tres segundos y no admite otra tala mientras está reducido.

- [x] 20. Implementar la normalización temporal que elimina árboles reducidos tras cinco minutos reales.
  - **RF:** RF-5.
  - **Hecho cuando:** al evaluar un tiempo igual o posterior a cinco minutos desde la reducción, el árbol deja de existir.

- [x] 21. Probar tala, bloqueo de árbol reducido y desaparición con tiempo real.
  - **RF:** RF-5.
  - **Hecho cuando:** las pruebas cubren reducción, ignorar una segunda tala y desaparición antes, justo en y después del límite de cinco minutos.

- [x] 22. Implementar la validación de riego por etapa y enfriamiento de un minuto real.
  - **RF:** RF-6.
  - **Hecho cuando:** un cultivo de etapa 1 a 3 solo es regable al cumplirse el minuto desde su último riego válido; la etapa 4 no es regable.

- [x] 23. Implementar el avance de una etapa al finalizar un riego válido.
  - **RF:** RF-6.
  - **Hecho cuando:** cada riego válido completado aumenta exactamente una etapa y registra su marca de tiempo.

- [x] 24. Probar riego, enfriamiento, cultivos iniciales y etapa cosechable.
  - **RF:** RF-6.
  - **Hecho cuando:** las pruebas cubren el minuto exacto, tres riegos de un cultivo plantado, etapas iniciales aleatorias y el bloqueo de riego en etapa 4.

- [x] 25. Implementar la cosecha inmediata y el incremento de una unidad en el inventario.
  - **RF:** RF-7.
  - **Hecho cuando:** cosechar un cultivo de etapa 4 lo elimina y suma una unidad; un cultivo anterior a etapa 4 no cambia.

- [x] 26. Probar cosecha e inventario sin límite.
  - **RF:** RF-7.
  - **Hecho cuando:** las pruebas confirman la cosecha única, el incremento de inventario y la ausencia de cambios en cultivos no cosechables.

- [x] 27. Implementar mensajes de resultado en español para destinos inválidos, objetivos inalcanzables y acciones no disponibles.
  - **RF:** RF-1, RF-3, RF-5, RF-6, RF-7.
  - **Hecho cuando:** cada intento ignorado definido por la spec genera un mensaje en español o deja explícitamente el estado sin cambios cuando corresponda.

- [x] 28. Probar los mensajes y los casos de interacción ignorada.
  - **RF:** RF-1, RF-3, RF-5, RF-6, RF-7.
  - **Hecho cuando:** las pruebas cubren destino inválido, objetivo inalcanzable, árbol reducido, riego en enfriamiento y cultivo no cosechable.

- [x] 29. Implementar guardado local versionado de los datos persistentes y su carga segura.
  - **RF:** RF-5, RF-6 y requisitos no funcionales.
  - **Hecho cuando:** mapa, cultivos, árboles, inventario y marcas de tiempo se guardan y restauran con una versión identificable.

- [x] 30. Implementar la restauración que cancela acciones, aplica temporizadores reales y reinicia guardados inválidos.
  - **RF:** RF-3, RF-5, RF-6 y requisitos no funcionales.
  - **Hecho cuando:** al abrir el juego el personaje queda en `idle`, se resuelven árboles y enfriamientos por tiempo real, y un guardado inválido inicia una partida nueva con mensaje en español.

- [x] 31. Probar guardado, restauración, temporizadores mientras el juego está cerrado y datos inválidos.
  - **RF:** RF-3, RF-5, RF-6 y requisitos no funcionales.
  - **Hecho cuando:** las pruebas verifican la conservación de datos válidos, el reinicio a `idle`, la continuidad temporal y el descarte seguro de datos inválidos o incompatibles.

- [x] 32. Crear la escena visual mínima del mapa, personaje, parcelas, árboles y cultivos con estados distinguibles.
  - **RF:** RF-1, RF-2, RF-4, RF-5, RF-6.
  - **Hecho cuando:** se distinguen visualmente mapa, tierra labrada, árbol reducido, cuatro etapas de cultivo y los estados `idle`, `walking`, `tilling dirt`, `chopping` y `watering`.

- [x] 33. Conectar clic y toque de la escena a una única intención de selección.
  - **RF:** RF-1, RF-2, RF-3.
  - **Hecho cuando:** clic y toque sobre la misma coordenada producen la misma intención enviada a la lógica.

- [x] 34. Conectar el estado de juego, el guardado y el panel de inventario, estado y mensajes.
  - **RF:** RF-3, RF-5, RF-6, RF-7 y requisitos no funcionales.
  - **Hecho cuando:** cada cambio persistente se guarda, el inventario y los mensajes en español se muestran, y la interfaz no contiene reglas de juego.

- [x] 35. Realizar la verificación manual del flujo completo y de los casos límite visuales.
  - **RF:** RF-1 a RF-7.
  - **Hecho cuando:** se valida manualmente clic y toque, desplazamiento, acciones, cancelación, riego, tala, cosecha, restauración y mensajes según la spec.

- [x] 36. Completar las pruebas de selección de destino y de interacción contextual.
  - **RF:** RF-1, RF-2, RF-3.
  - **Hecho cuando:** las pruebas verifican que la tierra cultivable se acepta según el flujo contextual, que una orden nueva durante una acción cancela la acción sin efecto y atiende solo la última orden, que no se inicia una segunda acción mientras haya una activa y que un objetivo sin parcela adyacente muestra el mensaje en español.

- [x] 37. Probar la selección de árboles que ya han desaparecido.
  - **RF:** RF-5.
  - **Hecho cuando:** después de normalizar el tiempo y retirar un árbol del mapa, seleccionarlo no inicia una tala ni altera el mapa.

- [x] 38. Completar las pruebas de crecimiento de cultivos iniciales y de aplicación diferida del riego.
  - **RF:** RF-6.
  - **Hecho cuando:** las pruebas confirman que cultivos iniciales en etapas 1, 2 y 3 requieren respectivamente tres, dos y un riegos válidos para alcanzar la etapa 4, y que un riego válido no cambia la etapa hasta completar sus tres segundos.

- [x] 39. Repetir la verificación completa de la spec y actualizar el veredicto de cumplimiento.
  - **RF:** RF-1 a RF-7.
  - **Hecho cuando:** las tareas 36 a 38 están cubiertas por pruebas aprobadas y la verificación manual confirma los criterios de finalización y todos los casos límite definidos.

- [x] 40. Representar el desplazamiento pendiente como una ruta ordenada de parcelas y avanzar la posición lógica una parcela por llegada.
  - **RF:** RF-1, RF-2, RF-3.
  - **Hecho cuando:** un destino o una interacción pendiente conserva una ruta transitable por tramos, la posición lógica no salta al destino y solo avanza al confirmar cada llegada.

- [x] 41. Probar el avance de rutas por parcelas consecutivas y la llegada final.
  - **RF:** RF-1, RF-2, RF-3.
  - **Hecho cuando:** las pruebas verifican que el personaje conserva `walking` entre tramos, alcanza `idle` solo tras el último tramo y resuelve la interacción pendiente únicamente al completar la ruta.

- [x] 42. Conectar el final de cada tramo visual con la intención `arrive` de la lógica.
  - **RF:** RF-2, RF-3.
  - **Hecho cuando:** al terminar un tramo se confirma una única llegada, se inicia el siguiente tramo cuando exista y la acción contextual solo comienza después de la llegada final.

- [x] 43. Interpolar en la escena la posición visual del personaje entre la parcela lógica actual y la siguiente de la ruta.
  - **RF:** RF-2.
  - **Hecho cuando:** durante cada tramo el personaje se renderiza en posiciones intermedias y no aparece directamente en la parcela de destino.

- [x] 44. Reiniciar la interpolación visual al sustituir una orden, cancelar una acción o completar una ruta.
  - **RF:** RF-2, RF-3.
  - **Hecho cuando:** una nueva selección descarta el tramo visual anterior y la posición renderizada vuelve a coincidir con la posición lógica al quedar `idle` o iniciar una acción.

- [x] 45. Realizar la verificación manual del desplazamiento continuo y de la sustitución de órdenes durante una ruta.
  - **RF:** RF-2, RF-3.
  - **Hecho cuando:** se confirma con clic y toque que el personaje recorre visualmente cada tramo, solo atiende el último destino u objetivo seleccionado y no inicia una acción antes de llegar a la parcela adyacente.

- [x] 46. Extender el modelo de movimiento transitorio con posición continua, tramo activo, ruta restante y hora del último avance.
  - **RF:** RF-2.
  - **Hecho cuando:** el estado de ejecución puede conservar una posición continua independiente de la posición lógica por parcela y dicho estado no forma parte del guardado.

- [x] 47. Implementar el avance puro del movimiento hasta una hora recibida.
  - **RF:** RF-2, RF-3.
  - **Hecho cuando:** al avanzar hasta una hora, la lógica actualiza la posición continua, confirma como máximo las parcelas alcanzadas y resuelve la llegada o la interacción pendiente al finalizar la ruta.

- [x] 48. Implementar el recálculo de ruta desde la posición continua actual al sustituir un destino u objetivo.
  - **RF:** RF-1, RF-2, RF-3.
  - **Hecho cuando:** una ruta nueva inicia exactamente en la posición continua vigente, conserva los tramos posteriores por parcelas transitables y reemplaza la orden pendiente anterior.

- [x] 49. Actualizar el procesamiento de selección para avanzar el movimiento antes de cancelar la orden anterior.
  - **RF:** RF-2, RF-3.
  - **Hecho cuando:** una selección durante `walking` usa la posición calculada en el instante de la selección y una selección durante una acción conserva la cancelación definida para esa acción.

- [x] 50. Probar el avance continuo y el recálculo de rutas durante un tramo.
  - **RF:** RF-1, RF-2, RF-3.
  - **Hecho cuando:** las pruebas verifican redirección a un destino y a un objetivo a mitad de tramo, clics repetidos sobre el mismo destino y ausencia de salto o ajuste al centro de una parcela.

- [x] 51. Enviar pulsos de avance con la hora actual desde la capa de interfaz mientras exista movimiento activo.
  - **RF:** RF-2.
  - **Hecho cuando:** la interfaz invoca la regla pura de avance durante `walking` sin calcular rutas, posiciones ni llegadas por cuenta propia.

- [x] 52. Renderizar al personaje desde la posición continua calculada por la lógica.
  - **RF:** RF-2.
  - **Hecho cuando:** la escena muestra la posición continua del estado de movimiento y no reinicia la representación al sustituir una orden.

- [x] 53. Verificar manualmente la redirección continua con clic y toque.
  - **RF:** RF-2, RF-3.
  - **Hecho cuando:** al seleccionar otro destino u objetivo durante un tramo, incluso repetidamente el mismo destino, el personaje cambia de recorrido desde el punto visible actual, sin regresar ni ajustarse al centro de una parcela.

- [x] 54. Corregir la orientación y la cancelación de órdenes durante una acción contextual.
  - **RF:** RF-3.
  - **Hecho cuando:** al seleccionar un objetivo desde una parcela adyacente, el personaje se orienta hacia él antes de iniciar la acción; una orden nueva durante una acción de tres segundos la cancela sin modificar el objetivo y deja al personaje en `idle`, sin ejecutar esa orden.

- [x] 55. Probar la orientación adyacente y la cancelación de una orden durante una acción contextual.
  - **RF:** RF-3.
  - **Hecho cuando:** las pruebas cubren las cuatro orientaciones desde parcelas adyacentes y verifican que una orden nueva durante labranza, tala o riego no aplica el efecto pendiente ni inicia desplazamiento, interacción o una acción nueva.

- [x] 56. Repetir la verificación completa de la spec tras corregir la interacción contextual.
  - **RF:** RF-1 a RF-7.
  - **Hecho cuando:** las tareas 54 y 55 están aprobadas, todos los criterios de finalización se verifican y el veredicto de cumplimiento de la spec es favorable.

- [x] 57. Extender el modelo de dominio y la partida nueva con la marca del último intento de generación de árboles.
  - **RF:** RF-8.
  - **Hecho cuando:** el estado persistente incluye `lastTreeGenerationAttemptAt` y una partida nueva lo inicializa sin introducir tipos implícitos ni estado de interfaz.

- [x] 58. Implementar la consulta pura de parcelas de césped candidatas que excluye las adyacentes a tierra de cultivo.
  - **RF:** RF-8.
  - **Hecho cuando:** la consulta devuelve solo parcelas de césped y descarta cada parcela con una tierra de cultivo al norte, este, sur u oeste.

- [x] 59. Implementar la validación pura de conectividad al ocupar una parcela candidata con un árbol.
  - **RF:** RF-8.
  - **Hecho cuando:** una parcela se rechaza si convertirla en no transitable elimina una conexión existente entre parcelas transitables.

- [x] 60. Probar el filtrado de candidatas y la preservación de conexiones transitables.
  - **RF:** RF-8.
  - **Hecho cuando:** las pruebas cubren césped válido, los cuatro lados adyacentes a tierra de cultivo, un cuello de botella bloqueado y una parcela que conserva las conexiones.

- [x] 61. Implementar la generación pura de un árbol vivo en una parcela válida elegida con aleatoriedad recibida.
  - **RF:** RF-8.
  - **Hecho cuando:** la regla crea un único árbol vivo en una candidata válida, permite que sea adyacente a otro árbol y no modifica el estado si no hay candidatas o ya existen cinco árboles vivos o reducidos.

- [x] 62. Probar la generación aleatoria controlada, el estado vivo y el límite de cinco árboles.
  - **RF:** RF-8.
  - **Hecho cuando:** las pruebas verifican la selección esperada para valores aleatorios controlados, la adyacencia permitida, el estado vivo y el bloqueo del sexto árbol incluidos los reducidos.

- [x] 63. Extender la normalización temporal para procesar cada intervalo vencido de cinco minutos y registrar todo intento.
  - **RF:** RF-8.
  - **Hecho cuando:** al alcanzar un intervalo se intenta una generación, se actualiza la marca incluso si falla y cada intervalo adicional vencido se procesa en orden.

- [x] 64. Probar la cadencia de cinco minutos, los intentos fallidos y los intervalos acumulados.
  - **RF:** RF-8.
  - **Hecho cuando:** las pruebas cubren el instante exacto de cinco minutos, la espera de otros cinco minutos tras alcanzar el límite o no hallar candidatas y el procesamiento de varios intervalos vencidos.

- [x] 65. Incluir la marca del último intento de generación en el guardado versionado y su validación segura.
  - **RF:** RF-8 y requisitos no funcionales.
  - **Hecho cuando:** un guardado válido conserva la marca de generación y un dato ausente, inválido o incompatible se descarta mediante el flujo seguro existente.

- [x] 66. Normalizar la generación de árboles al restaurar una partida con tiempo real transcurrido.
  - **RF:** RF-8 y requisitos no funcionales.
  - **Hecho cuando:** al restaurar se procesan en orden todos los intervalos vencidos desde la marca guardada, respetando candidatas, conectividad y el máximo de cinco árboles.

- [x] 67. Probar el guardado y la restauración de la generación periódica.
  - **RF:** RF-8 y requisitos no funcionales.
  - **Hecho cuando:** las pruebas verifican la persistencia de la marca, los intervalos transcurridos con el juego cerrado y el descarte seguro de guardados inválidos.

- [x] 68. Enviar pulsos con hora y aleatoriedad desde la interfaz para normalizar la generación periódica sin incorporar reglas en React o PixiJS.
  - **RF:** RF-8.
  - **Hecho cuando:** la capa de interfaz solicita la regla pura de tiempo durante la partida y al restaurar, y guarda cada cambio persistente resultante.

- [x] 69. Actualizar la escena para representar los árboles generados por el estado de juego.
  - **RF:** RF-8.
  - **Hecho cuando:** un árbol creado por la lógica aparece como árbol vivo en su parcela de césped y desaparece de la escena al dejar de existir en el estado.

- [x] 70. Realizar la verificación manual de la generación periódica de árboles y actualizar el veredicto de cumplimiento.
  - **RF:** RF-8.
  - **Hecho cuando:** se confirma que los árboles aparecen cada cinco minutos en césped válido, no bloquean accesos ni tierras de cultivo, respetan el máximo de cinco y se conservan correctamente tras cerrar y reabrir el juego.

- [ ] 71. Extender la consulta pura de parcelas candidatas para excluir las cuatro diagonales respecto de tierra de cultivo.
  - **RF:** RF-8.
  - **Hecho cuando:** una parcela de césped se descarta si tiene tierra de cultivo al norte, este, sur, oeste o en cualquiera de las cuatro diagonales.

- [ ] 72. Probar el filtrado de candidatas con las ocho posiciones adyacentes a tierra de cultivo.
  - **RF:** RF-8.
  - **Hecho cuando:** las pruebas unitarias rechazan las cuatro candidatas ortogonales y las cuatro diagonales, y conservan una candidata de césped fuera de esas ocho posiciones.

- [ ] 73. Probar la generación periódica cuando las únicas candidatas de césped son diagonales a tierra de cultivo.
  - **RF:** RF-8.
  - **Hecho cuando:** al vencer un intervalo de cinco minutos no se crea ningún árbol, se registra el intento y la siguiente generación no se intenta antes de otros cinco minutos.

- [ ] 74. Verificar manualmente que un árbol generado no queda en diagonal a una parcela de tierra de cultivo.
  - **RF:** RF-8.
  - **Hecho cuando:** con un mapa que contenga candidatas ortogonales, diagonales y válidas, solo se observa la generación en la candidata válida.
