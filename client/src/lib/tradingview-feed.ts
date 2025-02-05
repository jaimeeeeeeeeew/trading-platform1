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

interface PriceRange {
  high: number;
  low: number;
  max: number;
  min: number;
}

export class TradingViewDataFeed {
  private ws: WebSocketClient | null = null;
  private subscribers: Map<string, (data: any) => void> = new Map();
  private reconnectTimeout: number = 1000;
  private symbol: string;

  constructor(symbol: string) {
    this.symbol = symbol;
    this.connect();
  }

  private connect() {
    this.ws = new WebSocketClient(`wss://data.tradingview.com/socket.io/websocket`);

    this.ws.onOpen(() => {
      console.log('📈 Conectado al DataFeed de TradingView');
      this.subscribe();
    });

    this.ws.onMessage((data) => {
      try {
        const parsedData = JSON.parse(data);
        this.handleMessage(parsedData);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    this.ws.onClose(() => {
      console.log('❌ Desconectado del DataFeed de TradingView');
      setTimeout(() => this.connect(), this.reconnectTimeout);
    });

    this.ws.onError((error) => {
      console.error('Error en WebSocket:', error);
    });
  }

  private subscribe() {
    if (!this.ws) return;

    const subscribeMsg: SubscribeMessage = {
      action: 'subscribe',
      subs: [`${this.symbol}`]
    };

    this.ws.send(JSON.stringify(subscribeMsg));
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
    } else if (data.type === 'timescale_update') {
      this.notifySubscribers('scale', {
        visibleRange: data.visible_range,
        priceRange: data.price_range
      });
    }
  }

  public onPriceUpdate(callback: (data: any) => void) {
    this.subscribers.set('price', callback);
  }

  public onScaleUpdate(callback: (data: any) => void) {
    this.subscribers.set('scale', callback);
  }

  private notifySubscribers(type: string, data: any) {
    const callback = this.subscribers.get(type);
    if (callback) {
      callback(data);
    }
  }

  public getConfiguration(): DataFeedConfiguration {
    return {
      supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
      supports_marks: true,
      supports_time: true,
      supports_timescale_marks: true
    };
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}