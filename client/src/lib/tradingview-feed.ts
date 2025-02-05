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
  private ws: WebSocket | null = null;
  private subscribers: Map<string, (data: any) => void> = new Map();
  private symbol: string;
  private lastBar: Bar | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(symbol: string) {
    this.symbol = symbol.toLowerCase().replace(':', '').replace('perp', '');
    console.log('Initializing Binance Futures WebSocket for:', this.symbol);
    this.connect();
  }

  private connect() {
    try {
      // Binance Futures WebSocket URL
      const wsUrl = `wss://fstream.binance.com/ws/${this.symbol}@aggTrade/${this.symbol}@kline_1m`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Connected to Binance Futures WebSocket');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleBinanceMessage(data);
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.handleReconnect();
      };

    } catch (error) {
      console.error('Error establishing WebSocket connection:', error);
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), 5000 * Math.pow(2, this.reconnectAttempts - 1));
    }
  }

  private handleBinanceMessage(data: any) {
    if (data.e === 'aggTrade') {
      // Procesar datos de trades agregados
      const priceData: PriceData = {
        symbol: this.symbol,
        price: parseFloat(data.p),
        volume: parseFloat(data.q),
        high: parseFloat(data.p), // En trades agregados solo tenemos el precio actual
        low: parseFloat(data.p)
      };
      this.notifySubscribers('price', priceData);
    } else if (data.e === 'kline') {
      // Procesar datos de velas
      const kline = data.k;
      const bar: Bar = {
        time: Math.floor(kline.t / 1000),
        open: parseFloat(kline.o),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l),
        close: parseFloat(kline.c),
        volume: parseFloat(kline.v)
      };
      this.lastBar = bar;
      // También notificamos el precio actual
      const priceData: PriceData = {
        symbol: this.symbol,
        price: parseFloat(kline.c),
        volume: parseFloat(kline.v),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l)
      };
      this.notifySubscribers('price', priceData);
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
    console.log('Disconnecting from Binance Futures WebSocket');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
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