import socketio
import time
import logging

# Configurar logging
logging.basicConfig(level=logging.DEBUG)

# Crear cliente Socket.IO
sio = socketio.Client(logger=True, engineio_logger=True)

# URL del servidor
url = 'https://9d5eb702-2069-4a18-86c0-f979da1b873f-00-1r2wl6jp9d8e1.picard.replit.dev'

# Eventos de conexión
@sio.event
def connect():
    print('🟢 Conexión establecida')
    # Enviar datos de prueba
    test_data = {
        "symbol": "BTCUSDT",
        "price": 48000,
        "volume": 1.5
    }
    sio.emit('market_data', test_data)
    print('📤 Datos de prueba enviados')

@sio.event
def connect_error(data):
    print('❌ Error de conexión:', data)

@sio.event
def disconnect():
    print('🔴 Desconectado')

try:
    print('🔄 Intentando conectar a:', url)
    sio.connect(url, transports=['websocket'], wait_timeout=30)
    time.sleep(5)  # Mantener la conexión por 5 segundos
    sio.disconnect()
except Exception as e:
    print('❌ Error:', str(e))
