# Guion del video

**Cómo funcionan las aplicaciones de rastreo satelital** · Grupo 1 · Daniel Cruzado y Hernán Mundell

Duración estimada: 10–12 minutos. Cada sección corresponde a una diapositiva de `Rastreo-satelital.pptx` (el mismo texto está en las notas del orador).

## Antes de grabar

- `npm install` y `npx expo start`; abre la app en el celular (Expo Go) o en el navegador con `w`.
- Ten la presentación y la app abiertas para alternar.

## 1. Cómo funcionan las aplicaciones de rastreo satelital

Hola, somos Daniel Cruzado y Hernán Mundell, del grupo 1. Vamos a explicar cómo funciona una aplicación de rastreo satelital: desde la señal que sale de un satélite a 20 000 kilómetros de altura hasta el punto que aparece en un mapa. Al final lo mostramos con Rumbo, una app que hicimos en Expo.

## 2. Están en más apps de las que creemos

Las aplicaciones de rastreo satelital están en todas partes: empresas de logística que siguen sus camiones, apps de domicilios y transporte donde vemos al conductor acercarse, apps para compartir la ubicación con la familia, apps de deporte que miden la ruta y collares para mascotas. Todas resuelven el mismo problema: saber dónde está algo y contárselo a alguien más. Esa segunda parte, contarlo, es la que convierte un GPS en una app de rastreo.

## 3. Cuatro piezas, un solo recorrido

Toda app de rastreo tiene cuatro piezas. Los satélites transmiten su hora y su posición. El receptor GNSS del teléfono, junto con el sistema operativo, usa esas señales para calcular latitud, longitud y precisión. La app toma esa posición, la filtra, revisa si entró o salió de una zona y la guarda. Y el servidor de la plataforma recibe los puntos, guarda el historial y muestra el mapa en vivo. Un detalle importante: el GPS es pasivo. El satélite no sabe dónde estamos, el teléfono solo escucha. El rastreo existe porque la app envía esa posición por internet.

## 4. GNSS: más que GPS

GPS es solo uno de los sistemas. El nombre general es GNSS, sistemas globales de navegación por satélite. Está GPS de Estados Unidos, GLONASS de Rusia, Galileo de la Unión Europea y BeiDou de China, y los teléfonos actuales usan varios a la vez, lo que les da más satélites a la vista. Los satélites GPS orbitan a unos 20 200 kilómetros de altura y dan una vuelta cada 12 horas aproximadamente. Cada sistema tiene tres segmentos: el espacial, que son los satélites; el de control, estaciones en tierra que corrigen relojes y órbitas; y el de usuario, que es cualquier receptor, como nuestro celular.

## 5. Paso 1: medir distancias con el tiempo

El primer paso es medir distancias. Cada satélite lleva relojes atómicos y transmite continuamente la hora y su posición. El receptor compara cuándo salió la señal con cuándo llegó: ese tiempo de viaje, multiplicado por la velocidad de la luz, es la distancia al satélite. La señal tarda entre 67 y 86 milisegundos en llegar. El problema es que la luz es tan rápida que un error de un solo microsegundo equivale a 300 metros, y el reloj del celular es de cuarzo, mucho menos preciso que uno atómico. Por eso a esa medida se le llama pseudodistancia: lleva incluido el error del reloj del receptor.

## 6. Paso 2: trilateración con cuatro incógnitas

Con una distancia sabemos que estamos en algún punto de una esfera alrededor del satélite. Con dos, en la intersección de dos esferas, y con tres ya queda un punto. Pero hay una cuarta incógnita: el error del reloj del teléfono, que afecta por igual a todas las medidas. Por eso el receptor necesita al menos cuatro satélites: tres incógnitas de posición, x, y, z, y una del reloj. Las ecuaciones no son lineales, así que se resuelven por mínimos cuadrados de forma iterativa, con el método de Gauss-Newton: se parte de una estimación, se corrige y se repite. En nuestra app converge en unas cinco iteraciones. Con más de cuatro satélites sobran ecuaciones y el resultado es más robusto.

## 7. ¿Por qué a veces el punto salta?

La posición nunca es perfecta. Influye la geometría: si los satélites están repartidos por el cielo el error es pequeño, y si están agrupados se amplifica. Eso se mide con el DOP, la dilución de la precisión. Entre edificios aparece el multitrayecto: la señal rebota y recorre más camino, y es el error que más hace saltar el punto en la ciudad. La ionosfera y la troposfera retrasan la señal. En túneles o interiores simplemente no llega. También hay pequeños errores en los relojes y órbitas de los satélites, y la antena del celular es pequeña. En la práctica, un celular a cielo abierto tiene unos 3 a 5 metros de precisión, y entre edificios puede llegar a decenas de metros.

## 8. Lo que agrega el teléfono

Un celular no depende solo del GPS. Con A-GPS, o GPS asistido, descarga por internet la información de las órbitas, y así obtiene la primera posición en segundos en lugar de minutos. Android y iOS combinan el GNSS con redes Wi-Fi, antenas celulares y sensores como el acelerómetro: en Android se llama Fused Location Provider y en iOS Core Location. Los teléfonos recientes reciben varias constelaciones y dos frecuencias, L1 y L5, lo que reduce el error de la atmósfera y del multitrayecto. Y como la ubicación es un dato sensible, el sistema pide permiso: el usuario decide si la app la usa solo mientras está abierta o siempre.

## 9. De la posición al rastreo

Cuando la app recibe una posición todavía le falta trabajo. Primero la filtra: descarta los puntos con mala precisión y los saltos imposibles, por ejemplo si en un segundo el vehículo habría ido a 500 kilómetros por hora. Después revisa las geocercas, que son zonas en el mapa que disparan un aviso al entrar o salir, como llegar a la casa o salir del parqueadero. Luego guarda el punto en una cola y lo envía al servidor por lotes: así gasta menos batería y datos, y si no hay señal no se pierde nada, porque los puntos esperan y se envían al reconectar. Todo esto pensando en la batería: se pide la ubicación con un intervalo y una distancia mínima, y si debe funcionar en segundo plano, Android exige un servicio en primer plano con una notificación visible.

## 10. Nuestra implementación: Rumbo

Para mostrarlo hicimos Rumbo, una app en Expo con React Native y TypeScript. Tiene dos pestañas. En Satélites se ve cómo el teléfono calcula su posición: una constelación GPS simulada, las pseudodistancias y la trilateración, el mismo algoritmo que explicamos. En Rastreo se ve lo que hace una app de rastreo con esas posiciones: dibuja el recorrido, filtra puntos, detecta geocercas y envía al servidor por lotes. Se puede usar con un recorrido simulado, donde cada punto lo calcula el receptor simulado, o con el GPS real del teléfono a través de expo-location. El mapa es un dibujo en SVG, así que no depende de servicios externos ni de claves de API.

## 11. Demo 1 · El cálculo de la posición

En la pestaña Satélites vemos el cielo desde el receptor: el centro es justo encima de nosotros y el borde es el horizonte. A cielo abierto hay diez satélites en uso, repartidos por todo el cielo: el HDOP es 0,9, excelente, y el error real queda en unos 5 metros. La app también muestra que el reloj del receptor estaba desfasado 0,7 milisegundos, que sin corregir serían 210 kilómetros de error; como es la cuarta incógnita, se resuelve. Si pasamos a cañón urbano, los edificios tapan los satélites bajos y quedan cinco, todos arriba: la geometría empeora. Y si una señal llega rebotada, marcada en ámbar, el error sube a cientos de metros aunque el DOP diga que la geometría es buena. En el túnel solo quedan dos satélites y no hay solución: hacen falta cuatro.

**En pantalla (app):**

1. Abre la pestaña **Satélites** en **Cielo abierto**. Señala el cielo, el HDOP y el error real.
1. Toca **Nueva medición** un par de veces: el error cambia pero se queda en pocos metros.
1. Apaga satélites tocando los chips hasta dejar 3: aparece el mensaje de que se necesitan 4.
1. Cambia a **Cañón urbano** (pulsa **Nueva medición** hasta que un satélite salga en ámbar) y luego a **Túnel**.

## 12. Demo 2 · El rastreo

En la pestaña Rastreo iniciamos el recorrido simulado: un vehículo a unos 43 kilómetros por hora recorre la zona alrededor de la universidad y cada punto lo calcula el receptor simulado con los satélites que ve en ese tramo. La línea verde es el recorrido aceptado, y las X rojas son puntos descartados: en los tramos entre edificios aparecen saltos de 300 metros en un segundo o precisiones de más de 100 metros, y el filtro los saca. Los círculos morados son geocercas, y en los eventos aparece cuando entra o sale del parqueadero, del campus y del destino. En el paso subterráneo se pierde la señal y se recupera al salir. Por último, si apagamos los datos móviles los puntos se acumulan en la cola del teléfono, y al encenderlos se envían todos en un lote: no se pierde ninguno.

**En pantalla (app):**

1. Vuelve a **Rastreo**, deja **Recorrido simulado** y pulsa **Iniciar rastreo**.
1. Mientras avanza, señala la línea verde, las X rojas y los eventos de geocercas.
1. Apaga **Datos móviles**: sube el contador **En cola**. Espera unos segundos y enciéndelos: se envía un lote.
1. Espera el paso subterráneo (evento ámbar *Sin posición*) y la llegada al **Destino**.
1. Opcional: cambia a **GPS del teléfono** en un celular con Expo Go y camina unos 30 m para ver la salida de la geocerca.

## 13. Cómo está construida

El código sigue Clean Architecture. En el dominio está toda la lógica sin depender de Expo: geodesia, la parte GNSS con coordenadas, constelación, trilateración y DOP, y la parte de rastreo con el filtro, las geocercas, la cola y el caso de uso TrackingSession, que une todo. La capa de datos implementa los puertos: el GPS real con expo-location, el receptor simulado y un servidor en memoria. La presentación tiene los hooks, el mapa y el cielo en SVG, y las pantallas. Como el dominio no depende de la interfaz, lo probamos con 20 pruebas automáticas: por ejemplo, que la trilateración recupere la posición exacta y el error del reloj cuando no hay ruido, o que la cola no pierda puntos sin conexión.

## 14. Para llevar

Para cerrar, tres ideas. Primera: el GPS solo escucha; el teléfono calcula su posición midiendo cuánto tardan las señales, y el rastreo lo hace la app cuando envía esa posición. Segunda: se necesitan al menos cuatro satélites, tres para la posición y uno para corregir el reloj del teléfono. Y tercera: la precisión depende del entorno, y por eso una buena app de rastreo filtra los puntos, usa geocercas con margen y guarda los datos cuando no hay red. El código y estas diapositivas están en el repositorio. Muchas gracias.

