# Penji Draw Rush

Juego Canvas 2D sin dependencias. Sirve `dist/` con cualquier servidor HTTP, por ejemplo: `cd penji-draw-rush && python3 -m http.server -d dist 8080`, y abre `http://localhost:8080`.

Controles: arrastra sobre el juego para dibujar puentes y rampas libres (cada sección del dibujo es transitable); Espacio salta; P o Esc pausa; el botón circular permite jugar en táctil.

La versión incluye un recorrido endless con tres etapas (oficina, exterior y taller), plataformas con materiales distintos, peligros explícitos, pickups, gravedad y colisión sobre plataformas/trazos, tinta recuperable, tres vidas y un cursor de lápiz. Para revisar una etapa sin recorrerla, pulsa 1, 2 o 3 durante una partida. No se incluyen audio ni guardado de récord.
