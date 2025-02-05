import { WebSocketClient } from '@/lib/websocket';

interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SubscribeMessage {
  action: string;
  subs: string[];
}

interface DataFeedConfiguration {
  supported_resolutions: string[];
  supports_marks: boolean;
  supports_time: boolean;
  supports_timescale_marks: boolean;
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
  private reconnectTimeout: number = 1000;
  private symbol: string;
  private lastBar: Bar | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(symbol: string) {
    this.symbol = symbol;
    this.connect();
    this.startSimulation(); // Temporalmente simulamos datos hasta tener acceso real a TradingView
  }

  private connect() {
    // En un entorno real, aquí conectaríamos con TradingView
    console.log('📈 Iniciando conexión simulada para:', this.symbol);
  }

  private startSimulation() {
    // Simulación de datos en tiempo real
    let lastPrice = 45000 + Math.random() * 1000;

    this.intervalId = setInterval(() => {
      const change = (Math.random() - 0.5) * 100;
      const newPrice = lastPrice + change;
      const volume = Math.floor(Math.random() * 10 + 1);

      const priceData: PriceData = {
        symbol: this.symbol,
        price: newPrice,
        volume: volume,
        high: Math.max(newPrice, lastPrice),
        low: Math.min(newPrice, lastPrice)
      };

      this.handleMessage({
        type: 'price_update',
        ...priceData
      });

      lastPrice = newPrice;
    }, 1000); // Actualizar cada segundo
  }

  private handleMessage(data: any) {
    if (data.type === 'price_update') {
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
    this.subscribers.set('price', callback);
  }

  private notifySubscribers(type: string, data: any) {
    const callback = this.subscribers.get(type);
    if (callback) {
      callback(data);
    }
  }

  public disconnect() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
  }

  public getConfiguration(): DataFeedConfiguration {
    return {
      supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
      supports_marks: true,
      supports_time: true,
      supports_timescale_marks: true
    };
  }
}