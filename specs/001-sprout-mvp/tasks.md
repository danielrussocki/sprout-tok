# Tareas: prototipo inicial de Sprout Tok

- [ ] 01. Preparar la ejecución de pruebas unitarias con Vitest.
  - **RF:** RF-1 a RF-7.
  - **Hecho cuando:** el proyecto ejecuta todas las pruebas unitarias con un único comando documentado.

- [ ] 02. Definir los tipos del dominio: coordenada, dirección, personaje, parcela, árbol, cultivo, inventario y acción transitoria.
  - **RF:** RF-1 a RF-7.
  - **Hecho cuando:** el estado del juego y sus entidades se pueden representar sin tipos implícitos ni datos de interfaz.

- [ ] 03. Crear la función de partida nueva con un mapa delimitado y parcelas de tierra, césped y posiciones iniciales.
  - **RF:** RF-1.
  - **Hecho cuando:** una partida nueva devuelve un mapa con dimensiones, parcelas transitables y objetivos iniciales.

- [ ] 04. Implementar la asignación aleatoria de etapas iniciales con probabilidades 40/30/20/10.
  - **RF:** RF-1.
  - **Hecho cuando:** con un valor aleatorio controlado se obtiene la etapa esperada en cada rango de probabilidad.

- [ ] 05. Probar la creación de partida, los límites del mapa y la distribución de etapas iniciales.
  - **RF:** RF-1.
  - **Hecho cuando:** las pruebas cubren parcelas, límites y los cuatro rangos de distribución sin depender de aleatoriedad real.

- [ ] 06. Implementar consultas puras de transitabilidad, ocupación y detección de objetivos por coordenada.
  - **RF:** RF-1.
  - **Hecho cuando:** la lógica distingue tierra transitable, posiciones bloqueadas por árboles o cultivos y objetivos interactuables.

- [ ] 07. Probar las consultas de transitabilidad, ocupación y detección de objetivos.
  - **RF:** RF-1.
  - **Hecho cuando:** las pruebas verifican destinos válidos, inválidos, ocupados y objetivos tierra, árbol y cultivo.

- [ ] 08. Implementar la validación de destinos vacíos dentro de los límites del mapa.
  - **RF:** RF-1, RF-2.
  - **Hecho cuando:** un destino transitable es aceptado y uno fuera de límites o no transitable se rechaza sin mover al personaje.

- [ ] 09. Implementar la selección de parcela adyacente más cercana y el desempate norte, este, sur, oeste.
  - **RF:** RF-3.
  - **Hecho cuando:** la lógica devuelve la posición adyacente transitables más cercana o informa que no existe una.

- [ ] 10. Probar navegación hacia objetivos, desempates y objetivos sin parcela adyacente válida.
  - **RF:** RF-3.
  - **Hecho cuando:** las pruebas cubren las cuatro direcciones, el orden de desempate y el caso inalcanzable.

- [ ] 11. Implementar el estado transitorio de destino, orientación y movimiento `walking` del personaje.
  - **RF:** RF-2, RF-3.
  - **Hecho cuando:** el personaje pasa de `idle` a `walking`, llega al destino, se orienta al objetivo y vuelve a `idle`.

- [ ] 12. Implementar la sustitución de una orden pendiente por la última selección del jugador.
  - **RF:** RF-2, RF-3.
  - **Hecho cuando:** una nueva selección descarta el destino y la interacción pendiente anteriores.

- [ ] 13. Probar movimiento, llegada, orientación y sustitución de órdenes.
  - **RF:** RF-2, RF-3.
  - **Hecho cuando:** las pruebas confirman que solo la última orden modifica el destino o la interacción del personaje.

- [ ] 14. Implementar el ciclo genérico de acciones de tres segundos, con identificador de acción y cancelación segura.
  - **RF:** RF-3, RF-4, RF-5, RF-6.
  - **Hecho cuando:** una acción no aplica cambios antes de tres segundos y una orden nueva la cancela sin mutar el objetivo.

- [ ] 15. Probar el ciclo de acciones, la cancelación y la finalización obsoleta.
  - **RF:** RF-3, RF-4, RF-5, RF-6.
  - **Hecho cuando:** las pruebas cubren acción en curso, cancelación, objetivo retirado y finalización con identificador inválido.

- [ ] 16. Implementar la labranza de tierra cultivable sin labrar al finalizar la acción.
  - **RF:** RF-4.
  - **Hecho cuando:** la parcela solo queda labrada tras completar una acción válida de tres segundos.

- [ ] 17. Implementar la plantación inmediata en tierra labrada vacía.
  - **RF:** RF-4.
  - **Hecho cuando:** se crea un cultivo en etapa 1 sin consumir inventario y se rechaza una parcela ya ocupada.

- [ ] 18. Probar labranza y plantación.
  - **RF:** RF-4.
  - **Hecho cuando:** las pruebas verifican el retraso de labranza, la plantación ilimitada y la protección contra doble ocupación.

- [ ] 19. Implementar la tala que reduce un árbol al finalizar la acción.
  - **RF:** RF-5.
  - **Hecho cuando:** un árbol disponible pasa a reducido solo tras tres segundos y no admite otra tala mientras está reducido.

- [ ] 20. Implementar la normalización temporal que elimina árboles reducidos tras cinco minutos reales.
  - **RF:** RF-5.
  - **Hecho cuando:** al evaluar un tiempo igual o posterior a cinco minutos desde la reducción, el árbol deja de existir.

- [ ] 21. Probar tala, bloqueo de árbol reducido y desaparición con tiempo real.
  - **RF:** RF-5.
  - **Hecho cuando:** las pruebas cubren reducción, ignorar una segunda tala y desaparición antes, justo en y después del límite de cinco minutos.

- [ ] 22. Implementar la validación de riego por etapa y enfriamiento de un minuto real.
  - **RF:** RF-6.
  - **Hecho cuando:** un cultivo de etapa 1 a 3 solo es regable al cumplirse el minuto desde su último riego válido; la etapa 4 no es regable.

- [ ] 23. Implementar el avance de una etapa al finalizar un riego válido.
  - **RF:** RF-6.
  - **Hecho cuando:** cada riego válido completado aumenta exactamente una etapa y registra su marca de tiempo.

- [ ] 24. Probar riego, enfriamiento, cultivos iniciales y etapa cosechable.
  - **RF:** RF-6.
  - **Hecho cuando:** las pruebas cubren el minuto exacto, tres riegos de un cultivo plantado, etapas iniciales aleatorias y el bloqueo de riego en etapa 4.

- [ ] 25. Implementar la cosecha inmediata y el incremento de una unidad en el inventario.
  - **RF:** RF-7.
  - **Hecho cuando:** cosechar un cultivo de etapa 4 lo elimina y suma una unidad; un cultivo anterior a etapa 4 no cambia.

- [ ] 26. Probar cosecha e inventario sin límite.
  - **RF:** RF-7.
  - **Hecho cuando:** las pruebas confirman la cosecha única, el incremento de inventario y la ausencia de cambios en cultivos no cosechables.

- [ ] 27. Implementar mensajes de resultado en español para destinos inválidos, objetivos inalcanzables y acciones no disponibles.
  - **RF:** RF-1, RF-3, RF-5, RF-6, RF-7.
  - **Hecho cuando:** cada intento ignorado definido por la spec genera un mensaje en español o deja explícitamente el estado sin cambios cuando corresponda.

- [ ] 28. Probar los mensajes y los casos de interacción ignorada.
  - **RF:** RF-1, RF-3, RF-5, RF-6, RF-7.
  - **Hecho cuando:** las pruebas cubren destino inválido, objetivo inalcanzable, árbol reducido, riego en enfriamiento y cultivo no cosechable.

- [ ] 29. Implementar guardado local versionado de los datos persistentes y su carga segura.
  - **RF:** RF-5, RF-6 y requisitos no funcionales.
  - **Hecho cuando:** mapa, cultivos, árboles, inventario y marcas de tiempo se guardan y restauran con una versión identificable.

- [ ] 30. Implementar la restauración que cancela acciones, aplica temporizadores reales y reinicia guardados inválidos.
  - **RF:** RF-3, RF-5, RF-6 y requisitos no funcionales.
  - **Hecho cuando:** al abrir el juego el personaje queda en `idle`, se resuelven árboles y enfriamientos por tiempo real, y un guardado inválido inicia una partida nueva con mensaje en español.

- [ ] 31. Probar guardado, restauración, temporizadores mientras el juego está cerrado y datos inválidos.
  - **RF:** RF-3, RF-5, RF-6 y requisitos no funcionales.
  - **Hecho cuando:** las pruebas verifican la conservación de datos válidos, el reinicio a `idle`, la continuidad temporal y el descarte seguro de datos inválidos o incompatibles.

- [ ] 32. Crear la escena visual mínima del mapa, personaje, parcelas, árboles y cultivos con estados distinguibles.
  - **RF:** RF-1, RF-2, RF-4, RF-5, RF-6.
  - **Hecho cuando:** se distinguen visualmente mapa, tierra labrada, árbol reducido, cuatro etapas de cultivo y los estados `idle`, `walking`, `tilling dirt`, `chopping` y `watering`.

- [ ] 33. Conectar clic y toque de la escena a una única intención de selección.
  - **RF:** RF-1, RF-2, RF-3.
  - **Hecho cuando:** clic y toque sobre la misma coordenada producen la misma intención enviada a la lógica.

- [ ] 34. Conectar el estado de juego, el guardado y el panel de inventario, estado y mensajes.
  - **RF:** RF-3, RF-5, RF-6, RF-7 y requisitos no funcionales.
  - **Hecho cuando:** cada cambio persistente se guarda, el inventario y los mensajes en español se muestran, y la interfaz no contiene reglas de juego.

- [ ] 35. Realizar la verificación manual del flujo completo y de los casos límite visuales.
  - **RF:** RF-1 a RF-7.
  - **Hecho cuando:** se valida manualmente clic y toque, desplazamiento, acciones, cancelación, riego, tala, cosecha, restauración y mensajes según la spec.
