# Penji Draw Rush — plan de implementación para Codex

## Instrucción lista para usar
Implementa un videojuego web 2D en JavaScript moderno y Canvas 2D, sin frameworks ni dependencias externas. Usa los PNG de assets/ y lee asset-manifest.json. El juego combina un endless runner lateral con superficies que el jugador dibuja con el mouse. Entrega código modular, README para ejecutarlo con un servidor HTTP local y una versión jugable completa. Sigue las decisiones y los criterios de aceptación de este documento. Primero termina y prueba un segmento de oficina con dibujo y colisiones; después añade las otras etapas y el modo endless. No sustituyas el personaje ni los fondos por figuras provisionales.

## Experiencia
El robot avanza automáticamente de izquierda a derecha. Aunque visualmente flota, su cuerpo tiene gravedad: necesita apoyo. El jugador arrastra el lápiz para dibujar puentes, rampas y zonas de aterrizaje. El robot sube por rampas suaves y salta automáticamente desde una rampa ascendente al abandonar su extremo. Espacio o botón táctil de salto permite corregir errores, sin ser obligatorio para completar los patrones previstos. No existe vuelo libre.

Estética: mezcla de oficina creativa y collage de papel; violeta #6400E8, cyan #00B7E9, magenta #F400A1, crema #FFF8EB. Navidad sutil al inicio y más visible en el taller. Título provisional: Penji Draw Rush. UI y tutorial en español, textos configurables.

## Recursos entregados
| Archivo | Uso |
|---|---|
| assets/office.png | Fondo oficina |
| assets/outdoors.png | Fondo exterior invernal |
| assets/workshop.png | Fondo taller navideño |
| assets/robot-sheet.png | 8 poses, grilla visual 4 × 2, alpha real |
| assets/pencil.png | Puntero con punta abajo a la izquierda, alpha real |
| asset-manifest.json | Dimensiones originales verificadas y orden de cuadros |

Los fondos son imágenes completas, no capas de parallax y no se garantiza unión perfecta de sus bordes. Desplazarlos lentamente usando dos copias con un fundido en la unión, o mantenerlos estáticos mientras se desplaza el primer plano. No afirmar que son texturas seamless. La proporción de los fondos se aproxima a 16:9: usar cover sin deformar.

Sprite generado como base de animación; las poses tienen pequeñas variaciones de escala y centro. Preparar un atlas normalizado antes del acabado final: dividir por límites redondeados x=round(col*1774/4), y=round(row*887/2), medir bounding box alfa por celda, igualar altura visual y anclar abajo al centro. No asumir cuadros de anchura entera uniforme, pues 1774/4=443.5. Mantener pivote de física separado de la animación. Hover: cuadros 0–3 a 8 fps; launch:4; airborne:5; fall:6; land:7 durante 100 ms. Son poses iniciales, no una animación final pulida.

Cursor: dibujar pencil.png dentro de Canvas a unos 52×52 px CSS, alineando la punta visible aproximadamente a (0.10*ancho,0.955*alto) con el punto del mouse. Afinar visualmente el hotspot. No alinear el centro del lápiz al mouse. Ocultar cursor del sistema solo dentro del juego y restaurarlo en menús. Usar cursor del sistema como fallback.

Plataformas y obstáculos se dibujan en Canvas como geometría modular: papel crema con canto violeta en oficina, nieve/canto cyan en exterior, madera y borde de bastón navideño en taller. Esto mantiene exactas las superficies de colisión. Bombillas, gotas de tinta, regalos y partículas se pueden dibujar como iconos vectoriales sencillos. Los PNG entregados no incluyen música, efectos de sonido ni atlas separado de obstáculos.

## Controles y estados
- Pointer Events para mouse, lápiz o touch; pointer capture mientras se dibuja. touch-action:none solo en Canvas.
- Mantener y arrastrar: dibujar. Soltar: confirmar superficie. Esc cancela preview sin consumir tinta.
- Espacio: salto opcional. P/Esc: pausa. R: reinicio desde pantalla de derrota.
- Botón visible de salto para touch; botón de pausa accesible y foco de teclado.
- Estados boot, menu, tutorial, playing, paused, transition, gameOver.
- Pausar al perder foco; al volver mostrar reanudar. No descontar vidas por pestaña oculta.

## Mundo y física
Resolución lógica 1280×720, responsive con letterboxing y devicePixelRatio limitado a 2. Paso fijo 1/120 s, acumulador, máximo 8 subpasos por frame; limitar delta acumulado tras suspensión. Cámara sigue a robot en x=260 de pantalla. Simular en coordenadas de mundo y convertir pointer con rect del Canvas, escala de letterbox y cameraX.

Valores iniciales: cuerpo de colisión 48×62, arte 96×96; velocidad 220 px/s oficina, 250 exterior, 280 taller; gravedad 1500 px/s²; salto -540 px/s; coyote time 100 ms, buffer de salto 120 ms. Separar bob visual de collider. No cambiar velocidad bruscamente en transición.

Dibujo: capturar puntos cada 8 px; máximo 700 px de longitud por trazo y 3 trazos activos. Solo construir delante del robot (al menos 80 px) y fuera de su cuerpo. Al pointerdown, reducir velocidad de simulación a 40% por máximo 2 s reales; dibujo y cursor siguen a tiempo real. Volver a normal al soltar. Trazos en coordenadas de mundo: deben moverse con el escenario, no quedarse pegados a pantalla. Mostrar preview punteado, válido violeta e inválido rojo. Convertir al soltar, no durante el arrastre.

Validación MVP: recorrido de izquierda a derecha; invertir si el usuario dibuja de derecha a izquierda; rechazar retrocesos interiores, segmentos verticales y pendientes mayores de 35°. Simplificar puntos con tolerancia 3 px. Rechazar si atraviesa un sólido, un peligro, un límite de escenario o el cuerpo; rechazar también si excede tinta o límites. No permitir exploits dibujando directamente bajo el robot. Mostrar razón breve y conservar tinta si es inválido.

Cada segmento define y=f(x) y normal de apoyo. Colisión de superficies de un solo sentido: aterrizar al cruzar la altura de la superficie desde arriba y con velocidad relativa descendente. Barrer el pie del robot entre posición anterior y nueva para evitar atravesar líneas a velocidad alta. En apoyo, resolver y con el segmento y permitir subir pendientes suaves; comprobar los dos extremos inferiores del collider para evitar enganchar bordes. Las plataformas rectangulares usan barrido AABB. Obstáculos usan AABB independientes. Prioridad estable entre superficies superpuestas; elegir el apoyo superior válido. No usar un motor rígido completo para este MVP.

Salto desde rampa: si abandona un extremo ascendente con al menos 45 px de rampa continua y pendiente >=12°, aplicar impulso vertical de -420 a -540 según pendiente; enfriamiento 250 ms y solo una vez por extremo. Un puente plano no activa salto. Mostrar un pequeño arco de predicción cerca de la rampa durante el tutorial.

## Tinta, errores y puntuación
Tinta 100 unidades; costo 1 por 10 px, recuperación 8 unidades/s cuando no se dibuja; gotas recuperan 25. Trazo dura 7 s de simulación y comienza a parpadear durante último segundo. No borrar soporte mientras sostiene al robot: aplazar desaparición hasta que lo abandone o alcance máximo 2 s extra. Al crear cuarto trazo, rechazar hasta liberar uno; nunca borrar silenciosamente la superficie actual.

3 vidas, 1 s invulnerable tras daño. Caída: restar vida y reaparecer en plataforma segura del patrón actual con tinta completa; cámara y generador se reposicionan juntos. Fin con cero vidas. Puntos por distancia y bombillas/regalos; guardar récord con localStorage protegido con try/catch. Sin servidor, login ni descuentos reales.

## Tres etapas
| Etapa | Primera pasada | Patrones | Decoración |
|---|---|---|---|
| Oficina | 0–600 m | Huecos cortos, una rampa, plataforma elevada | Guirnaldas y nieve tras ventanas |
| Exterior | 600–1200 m | Puentes más largos y dos alturas | Pinos, casas y copos |
| Taller | 1200–1800 m | Combinar rampa, salto y aterrizaje | Regalos, luces, árbol |

Usar 100 px de mundo=1 m. Tras 1800 m repetir ciclo con variaciones y velocidad limitada a 340 px/s. Primera transición se adelanta durante QA con un ajuste debug, no esperar toda la partida para verificar. Crossfade de fondo durante 1.5 s y segmento seguro de 3 s, sin obstáculos sorpresa. Aumentar dificultad solo al comenzar un patrón. Objetivo sesión casual 3–5 minutos; ajustar distancias tras playtest.

## Generación justa
No generar plataformas al azar sin restricciones. Crear biblioteca de chunks deterministas con entrada/salida a alturas conocidas y solución de referencia. Cada chunk lleva plataformas, peligros, pickups, tinta mínima y trazo de solución. Validar por simulación la solución a velocidad máxima de su etapa, duración de trazos y tinta disponible. Elegir solo chunks compatibles con la altura de salida anterior y reservar un tramo seguro entre patrones. Al menos 2.5 s de anticipación visual para el obstáculo a la velocidad actual. Tutorial inicial sin muerte: primero puente, luego rampa y salto automático. Semilla configurable para reproducir bugs. Reinicio debe limpiar arrays, timers, pointer capture y listeners sin duplicarlos.

## Arquitectura sugerida
index.html; styles.css; src/main.js; src/config.js; src/assets.js; src/game.js; src/input.js; src/player.js; src/drawing.js; src/collision.js; src/world.js; src/chunks.js; src/renderer.js; src/ui.js. Separar update de render. Liberar chunks/trazos detrás de cámara, limitar partículas a 150. Pool de pickups y obstáculos si el perfil lo requiere. No cargar recursos remotos ni depender de CDN.

## Orden de trabajo
1. Loader, Canvas responsive, fondo oficina, robot normalizado y menú.
2. Movimiento automático, gravedad y plataformas fijas; pausa y reinicio.
3. Pointer a mundo, preview, validación y presupuesto de tinta.
4. Apoyo sobre líneas, rampas, salto automático y hueco resuelto dibujando.
5. Tutorial, daños, checkpoints y HUD.
6. Chunks validados y generación reproducible.
7. Fondos exterior/taller y transiciones seguras; repetición endless.
8. Touch, feedback visual, sonido opcional sintetizado tras gesto y mute.
9. QA y ajuste de dificultad. Entregar README con limitaciones reales.

## Verificación de aceptación
- Sin errores en consola; iniciar desde servidor HTTP local, no file://.
- Una misma seed funciona a 30,60,120 fps; distancia equivalente tras 60 s.
- Puente, rampa ascendente, salto, caída y aterrizaje funcionan sin atravesar líneas.
- Cursor toca exactamente donde se pinta en distintas escalas y DPR.
- Trazos se quedan en el mundo durante scroll y ralentización.
- Tinta insuficiente/trazo inválido no crea colisión ni consume recursos.
- Volver de otra pestaña no causa un salto temporal ni muerte.
- Diez reinicios no duplican eventos; 10 min de juego no acumulan chunks.
- Transiciones no teletransportan robot ni introducen huecos inevitables.
- Tutorial completado con solo mouse; touch permite dibujar sin desplazar página.
- Fondos y arte no se deforman, robot no tiene piernas y punta del lápiz coincide.
- Tests unitarios de conversión pantalla-mundo, costo de longitud, validación de pendientes y colisión barrida; prueba integrada de chunk solucionable.

## Entrega actual
Este paquete contiene assets visuales y especificación para implementar; no contiene todavía el juego ejecutable. Las imágenes fueron creadas con generación de imágenes usando el concepto seleccionado como referencia. Revisar y normalizar sprites, y afinar el hotspot del lápiz durante implementación. No presentar las ilustraciones generadas como vector original ni como animación ya validada en motor.
