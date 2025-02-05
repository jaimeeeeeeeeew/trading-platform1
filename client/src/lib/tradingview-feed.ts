import { WebSocketClient } from '@/lib/websocket';

interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceData {
  symbol: string;
  price: number;
  volume: number;
  high: number;
  low: number;
}

export class TradingViewDataFeed {
  private ws: WebSocketClient | null = null;
  private subscribers: Map<string, (data: any) => void> = new Map();
  private symbol: string;
  private lastBar: Bar | null = null;
  private socket: WebSocket | null = null;

  constructor(symbol: string) {
    this.symbol = symbol;
    console.log('🚀 Iniciando TradingView DataFeed para:', symbol);
    this.connect();
  }

  private connect() {
    // Usar WebSocket de TradingView para datos en tiempo real
    const wsUrl = 'wss://data.tradingview.com/socket.io/websocket';

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('📡 Conexión WebSocket establecida');
        this.subscribe();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📊 Datos recibidos:', data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error procesando mensaje:', error);
        }
      };

      this.socket.onerror = (error) => {
        console.error('Error en WebSocket:', error);
      };

      this.socket.onclose = () => {
        console.log('Conexión WebSocket cerrada');
        // Reconectar después de un delay
        setTimeout(() => this.connect(), 5000);
      };

    } catch (error) {
      console.error('Error estableciendo conexión:', error);
    }
  }

  private subscribe() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket no está conectado');
      return;
    }

    const subscribeMsg = {
      action: "subscribe",
      symbols: [this.symbol]
    };

    console.log('📝 Suscribiendo a:', this.symbol);
    this.socket.send(JSON.stringify(subscribeMsg));
  }

  private handleMessage(data: any) {
    if (data.type === 'price_update') {
      console.log('💹 Actualización de precio recibida:', data);
      this.notifySubscribers('price', {
        symbol: this.symbol,
        price: data.price,
        volume: data.volume,
        high: data.high,
        low: data.low
      });
    }
  }

  public onPriceUpdate(callback: (data: PriceData) => void) {
    console.log('✅ Registrando callback para actualizaciones de precio');
    this.subscribers.set('price', callback);
  }

  private notifySubscribers(type: string, data: any) {
    const callback = this.subscribers.get(type);
    if (callback) {
      callback(data);
    }
  }

  public disconnect() {
    console.log('❌ Desconectando DataFeed');
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.subscribers.clear();
  }

  public getConfiguration() {
    return {
      supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
      supports_marks: true,
      supports_time: true,
      supports_timescale_marks: true
    };
  }
}