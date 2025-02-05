import { WebSocket } from 'ws';

class BinanceWebSocketTest {
  private ws: WebSocket | null = null;
  private symbol: string;

  constructor(symbol: string) {
    this.symbol = symbol.toLowerCase();
    console.log('Iniciando prueba de WebSocket para:', this.symbol);
    this.connect();
  }

  private connect() {
    // URL para futuros de Binance, usando streams de trades agregados y klines de 1 minuto
    const wsUrl = `wss://fstream.binance.com/ws/${this.symbol}@aggTrade/${this.symbol}@kline_1m`;
    console.log('Conectando a:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ Conexión establecida');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString());
          this.processMessage(data);
        } catch (error) {
          console.error('Error procesando mensaje:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Error en WebSocket:', error);
      };

      this.ws.onclose = () => {
        console.log('Conexión cerrada');
      };

    } catch (error) {
      console.error('Error estableciendo conexión:', error);
    }
  }

  private processMessage(data: any) {
    // Procesar diferentes tipos de mensajes
    if (data.e === 'aggTrade') {
      console.log('📊 Trade Agregado:', {
        precio: data.p,
        cantidad: data.q,
        tiempo: new Date(data.T).toISOString()
      });
    } else if (data.e === 'kline') {
      console.log('🕯️ Vela:', {
        tiempo: new Date(data.k.t).toISOString(),
        apertura: data.k.o,
        alto: data.k.h,
        bajo: data.k.l,
        cierre: data.k.c,
        volumen: data.k.v
      });
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      console.log('WebSocket desconectado');
    }
  }
}

// Crear instancia para probar
const tester = new BinanceWebSocketTest('btcusdt');

// Mantener el proceso vivo
process.on('SIGINT', () => {
  tester.disconnect();
  process.exit(0);
});
