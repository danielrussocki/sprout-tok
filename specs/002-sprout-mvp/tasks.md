# Tareas: segundo MVP de Sprout Tok

- [ ] 01. Extender los tipos de dominio con stamina, progreso de recuperación, fracción de carrera, `running` y referencia activa.
  - **RF:** RF-3, RF-4, RF-5, RF-6, RF-7.
  - **Hecho cuando:** el modelo distingue datos persistentes de movimiento transitorio y representa todos los valores de stamina sin tipos implícitos.

- [ ] 02. Inicializar la stamina de una partida nueva en 36 y normalizar sus límites inclusivos de 0 a 36.
  - **RF:** RF-3.
  - **Hecho cuando:** una partida nueva devuelve stamina 36 y ninguna regla puede devolver un valor inferior a 0 o superior a 36.

- [ ] 03. Crear pruebas unitarias de creación de partida y límites de stamina.
  - **RF:** RF-3.
  - **Hecho cuando:** las pruebas cubren stamina inicial, límite inferior y límite superior con resultados deterministas.

- [ ] 04. Implementar la regla pura de recuperación de stamina para `idle` cada 15 segundos.
  - **RF:** RF-3, RF-6.
  - **Hecho cuando:** un acumulador de 15 segundos completos en `idle` recupera exactamente un punto sin exceder 36.

- [ ] 05. Implementar la recuperación de stamina para `walking` cada 30 segundos y la conservación del progreso al alternar entre `idle` y `walking`.
  - **RF:** RF-6.
  - **Hecho cuando:** la regla conserva el tiempo parcial entre ambos estados y aplica la cadencia del estado vigente.

- [ ] 06. Implementar la pausa de recuperación durante `running` y acciones contextuales.
  - **RF:** RF-6.
  - **Hecho cuando:** al entrar en carrera o en una acción se conserva el progreso parcial sin incrementarlo y se reanuda solo en `idle` o `walking`.

- [ ] 07. Implementar el reinicio del progreso de recuperación al alcanzar 36 y el descarte de intervalos excedentes.
  - **RF:** RF-3, RF-6.
  - **Hecho cuando:** alcanzar 36 deja el progreso de recuperación en cero, incluso si el mismo pulso contenía intervalos adicionales.

- [ ] 08. Probar recuperación, pausas, alternancia de estado, máximo y múltiples intervalos.
  - **RF:** RF-3, RF-6.
  - **Hecho cuando:** las pruebas cubren 15 s en `idle`, 30 s en `walking`, pausas, cambio exacto de estado y llegada a 36.

- [ ] 09. Implementar la regla pura de acumulación y consumo de stamina por segundos completos de carrera.
  - **RF:** RF-5.
  - **Hecho cuando:** cada segundo completo acumulado descuenta exactamente un punto y la fracción restante se conserva sin reducir stamina aún.

- [ ] 10. Implementar la conservación de la fracción de carrera entre trayectos.
  - **RF:** RF-5, RF-7.
  - **Hecho cuando:** una carrera interrumpida conserva su fracción y una carrera posterior la usa para completar el siguiente segundo de consumo.

- [ ] 11. Probar consumo por carrera, fracciones acumuladas y límites de stamina.
  - **RF:** RF-3, RF-5.
  - **Hecho cuando:** las pruebas cubren segundos completos, llegada antes del siguiente segundo, acumulación entre carreras y el límite en cero.

- [ ] 12. Extender el avance continuo de movimiento para usar la velocidad doble en `running`.
  - **RF:** RF-4.
  - **Hecho cuando:** sobre la misma ruta y duración, `running` recorre el doble de distancia que `walking` sin modificar la ruta.

- [ ] 13. Integrar los hitos de llegada, segundos de carrera y agotamiento en el avance de movimiento.
  - **RF:** RF-4, RF-5.
  - **Hecho cuando:** un pulso de movimiento puede procesar llegadas y consumo, y pasa a `walking` al bajar de 13 sin salto ni ajuste al centro del tile.

- [ ] 14. Probar la velocidad de carrera, el agotamiento de 13 a 12 y la continuidad a mitad de tramo.
  - **RF:** RF-4, RF-5.
  - **Hecho cuando:** las pruebas confirman velocidad doble, transición automática a pie y conservación de la posición continua y ruta pendiente.

- [ ] 15. Extender las órdenes con una referencia activa para destinos vacíos y objetivos contextuales.
  - **RF:** RF-2, RF-4.
  - **Hecho cuando:** una orden válida conserva como referencia el tile de destino vacío o el objetivo contextual originalmente seleccionado.

- [ ] 16. Implementar la activación de carrera al repetir la referencia activa durante `walking` con al menos 13 de stamina.
  - **RF:** RF-4.
  - **Hecho cuando:** repetir la referencia activa cambia solo de `walking` a `running` con stamina suficiente y con menos de 13 conserva `walking`.

- [ ] 17. Implementar el tratamiento de órdenes durante `running` y redirecciones.
  - **RF:** RF-2, RF-4, RF-5.
  - **Hecho cuando:** repetir la referencia activa mantiene sin cambios la carrera, mientras una referencia distinta sustituye la ruta y comienza caminando desde la posición continua actual.

- [ ] 18. Implementar la cancelación de una orden activa cuando la nueva referencia no tenga ruta válida.
  - **RF:** RF-2.
  - **Hecho cuando:** un destino u objetivo sin ruta elimina la ruta y referencia activas y deja al personaje en `idle`.

- [ ] 19. Probar referencias activas, inicio de carrera, repetición durante carrera, redirección y ruta inválida.
  - **RF:** RF-2, RF-4, RF-5.
  - **Hecho cuando:** las pruebas cubren destino vacío, objetivo contextual, stamina 12 y 13, repetición en `running`, redirección continua y cancelación por ruta inválida.

- [ ] 20. Ajustar la resolución de llegada para objetivos contextuales invalidados durante una carrera.
  - **RF:** RF-2, RF-4.
  - **Hecho cuando:** si el objetivo deja de estar disponible durante `running`, el personaje completa la ruta y no ejecuta la acción al llegar.

- [ ] 21. Integrar las transiciones de inicio y fin de acciones contextuales con la pausa y reanudación de recuperación.
  - **RF:** RF-6.
  - **Hecho cuando:** una acción activa no recupera stamina y, al terminar o cancelarse, el progreso previo queda disponible al volver a un estado recuperable.

- [ ] 22. Probar objetivo invalidado en carrera y pausa de recuperación en acciones contextuales.
  - **RF:** RF-2, RF-4, RF-6.
  - **Hecho cuando:** las pruebas confirman llegada sin acción al invalidarse el objetivo y ausencia de recuperación durante una acción.

- [ ] 23. Integrar la normalización de stamina en los pulsos de tiempo y movimiento con prioridad temporal correcta.
  - **RF:** RF-4, RF-5, RF-6.
  - **Hecho cuando:** antes de procesar una selección o transición en una hora dada se avanza la stamina hasta esa hora y se aplica primero la recuperación que vence exactamente en ella.

- [ ] 24. Probar pulsos grandes y la coincidencia entre recuperación y solicitud de carrera.
  - **RF:** RF-4, RF-5, RF-6.
  - **Hecho cuando:** las pruebas confirman que una recuperación de 12 a 13 permite correr en esa misma hora y que varios hitos no pierden ni adelantan distancia o stamina.

- [ ] 25. Actualizar el esquema de guardado local a la versión 4 con stamina y ambos progresos parciales.
  - **RF:** RF-3, RF-5, RF-6, RF-7.
  - **Hecho cuando:** un guardado válido serializa stamina, progreso de recuperación y fracción de carrera junto con los datos existentes.

- [ ] 26. Implementar la validación segura de los campos nuevos de stamina al cargar un guardado.
  - **RF:** RF-3, RF-7.
  - **Hecho cuando:** un valor ausente, no entero, fuera de rango o incompatible descarta el guardado e inicia una partida nueva con mensaje en español.

- [ ] 27. Implementar la restauración de stamina con cadencia `idle` durante el tiempo cerrado.
  - **RF:** RF-6, RF-7.
  - **Hecho cuando:** al restaurar se conserva el progreso parcial, se aplica el tiempo cerrado a intervalos de 15 segundos, se respeta el máximo y el personaje queda `idle` sin restaurar `running`.

- [ ] 28. Probar guardado, validación y restauración de stamina.
  - **RF:** RF-3, RF-5, RF-6, RF-7.
  - **Hecho cuando:** las pruebas cubren versión 4 válida, fracción de carrera persistente, recuperación cerrada, máximo, estado restaurado `idle` y datos inválidos.

- [ ] 29. Enviar pulsos de tiempo desde la pantalla de juego mientras exista movimiento o stamina recuperable.
  - **RF:** RF-3, RF-5, RF-6.
  - **Hecho cuando:** la interfaz entrega únicamente la hora actual a las reglas y persiste cada cambio resultante sin calcular stamina ni rutas por cuenta propia.

- [ ] 30. Derivar y renderizar marcadores para cada tile pendiente de la ruta activa.
  - **RF:** RF-2.
  - **Hecho cuando:** los marcadores aparecen en todos los tiles pendientes y desaparecen al alcanzarlos, redirigir, iniciar una acción, cancelar o llegar.

- [ ] 31. Mostrar la stamina actual en la parte superior del canvas.
  - **RF:** RF-3.
  - **Hecho cuando:** el canvas presenta el valor del estado de stamina y lo actualiza tras consumo, recuperación o restauración.

- [ ] 32. Implementar el estado visual local de puntero de ratón o lápiz y la detección de tile bajo hover.
  - **RF:** RF-1.
  - **Hecho cuando:** la posición del puntero y el tile bajo hover se actualizan sin enviar intenciones ni alterar el estado de juego.

- [ ] 33. Renderizar el puntero personalizado y el marco de hover dentro del canvas.
  - **RF:** RF-1.
  - **Hecho cuando:** el cursor habitual se reemplaza dentro del canvas para ratón o lápiz, el marco sigue solo tiles del mapa y el puntero permanece sin marco fuera del mapa.

- [ ] 34. Gestionar salida del canvas e interacción exclusiva por toque para el feedback de puntero.
  - **RF:** RF-1.
  - **Hecho cuando:** al salir se ocultan puntero y marco y vuelve el cursor habitual; con toque no aparece ninguno de los dos.

- [ ] 35. Conectar clic y toque de la escena con la referencia enviada a las reglas sin alterar el feedback de hover.
  - **RF:** RF-1, RF-2, RF-4.
  - **Hecho cuando:** clic y toque equivalentes producen la misma selección, redirección o carrera, y el movimiento del puntero por sí solo no modifica mapa, ruta, acciones ni stamina.

- [ ] 36. Realizar la verificación manual de todos los feedbacks visuales y flujos de movilidad.
  - **RF:** RF-1 a RF-7.
  - **Hecho cuando:** se confirma manualmente puntero, hover, toque, marcadores, stamina visible, caminar, correr, agotamiento, recuperación, redirección, restauración y ausencia de teletransporte.

- [ ] 37. Ejecutar las pruebas unitarias, lint, comprobación de formato y compilación final.
  - **RF:** RF-1 a RF-7.
  - **Hecho cuando:** las pruebas, `pnpm lint`, `pnpm fmt:check` y `pnpm build` finalizan sin fallos no resueltos.
