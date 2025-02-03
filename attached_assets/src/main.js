console.log("main.js se está ejecutando");

// Establece la conexión WebSocket
let socket = new WebSocket('ws://localhost:8080');

socket.onopen = function() {
  console.log("Conexión WebSocket establecida.");
};

// Muestra errores de conexión WebSocket
socket.onerror = function(error) {
  console.error("WebSocket Error:", error);
};

// Intenta reconectar cuando la conexión se cierra
socket.onclose = function() {
  console.log("WebSocket se ha desconectado. Intentando reconectar...");
  setTimeout(() => {
    socket = new WebSocket('ws://localhost:8080');
  }, 5000);
};

// Función para actualizar una métrica específica en la interfaz
function updateMetric(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.querySelector('.value').textContent = value;
  } else {
    console.warn(`Elemento con ID ${id} no encontrado.`);
  }
}

// Función para añadir una transacción a la lista de transacciones
function addTransaction(volume, price) {
  const transactionList = document.getElementById('transaction_list');
  
  if (transactionList) {
    const transactionItem = document.createElement('li');
    transactionItem.classList.add('transaction-item');
    transactionItem.textContent = `Vol: ${volume} - Precio: ${price}`;
    transactionList.prepend(transactionItem);

    // Limitar a las últimas 10 transacciones
    if (transactionList.children.length > 10) {
      transactionList.removeChild(transactionList.lastChild);
    }
  } else {
    console.error("No se encontró el elemento #transaction_list.");
  }
}

// Recibir datos del backend en tiempo real y actualizar la interfaz
socket.onmessage = function(event) {
  const data = JSON.parse(event.data);

  // Actualizar Dirección y Dominancia
  updateMetric('direccion', data.direccion);
  updateMetric('dominancia', data.dominancia);

  // Actualizar Delta Futuros y Delta Spot
  updateMetric('delta_futuros', data.delta_futuros);
  updateMetric('delta_spot', data.delta_spot);

  // Agregar transacciones en tiempo real
  if (Array.isArray(data.transacciones)) {
    data.transacciones.forEach(transaccion => {
      addTransaction(transaccion.volume, transaccion.price);
    });
  } else {
    console.warn("Transacciones no disponibles en el mensaje.");
  }
};

// Configuración del widget de TradingView
new TradingView.widget({
  container_id: "tradingview_chart",
  autosize: true,
  symbol: "BINANCE:BTCUSDT",
  interval: "1",
  timezone: "Etc/UTC",
  theme: "dark",
  style: "1",
  locale: "es",
  toolbar_bg: "#f1f3f6",
  enable_publishing: false,
  hide_top_toolbar: true,
  hide_side_toolbar: false,
});

// Simulación del perfil de volumen
const volumeData = [
  { priceLevel: "71200", volume: 100 },
  { priceLevel: "70300", volume: 300 },
  { priceLevel: "69300", volume: 200 },
  { priceLevel: "68850", volume: 400 },
  { priceLevel: "68350", volume: 250 },
  { priceLevel: "67800", volume: 350 },
];

const volumeProfileContainer = document.getElementById('volume_profile');

volumeData.forEach(data => {
  const bar = document.createElement("div");
  bar.classList.add("volume-bar");

  bar.style.width = `${data.volume}px`;
  bar.style.backgroundColor = data.volume > 300 ? "#8b1e1e" : "#4caf50";
  
  bar.textContent = `Precio: ${data.priceLevel} | Volumen: ${data.volume}`;
  volumeProfileContainer.appendChild(bar);
});