import { WebSocketClient } from '@/lib/websocket';
import { tradingViewService } from './tradingview-service';

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
    console.log('Initializing TradingViewDataFeed for symbol:', symbol);
    this.symbol = symbol;
    this.connect();
  }

  private connect() {
    console.log('📈 Connecting to TradingView DataFeed for:', this.symbol);

    this.ws = new WebSocketClient(`wss://demo.tradingview.com/socket.io/websocket`);

    this.ws.onOpen(() => {
      console.log('📈 Connected to TradingView DataFeed');
      this.subscribe();
    });

    this.ws.onMessage((data) => {
      try {
        console.log('Raw message received:', data);
        const parsedData = JSON.parse(data);
        console.log('Parsed message:', parsedData);
        this.handleMessage(parsedData);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    this.ws.onError((error) => {
      console.error('WebSocket error:', error);
    });
  }

  private subscribe() {
    if (!this.ws) {
      console.error('Cannot subscribe: WebSocket not connected');
      return;
    }

    const subscribeMsg: SubscribeMessage = {
      action: 'subscribe',
      subs: [this.symbol]
    };

    console.log('Subscribing to:', subscribeMsg);
    this.ws.send(JSON.stringify(subscribeMsg));
  }

  public async getInitialData(from: number, to: number): Promise<Bar[]> {
    try {
      console.log('Fetching initial data:', {
        symbol: this.symbol,
        from: new Date(from * 1000).toISOString(),
        to: new Date(to * 1000).toISOString()
      });

      const resolution = tradingViewService.intervalToResolution('1h');
      const data = await tradingViewService.getHistory({
        symbol: this.symbol,
        resolution,
        from,
        to
      });

      console.log('Initial data received:', {
        dataPoints: data.length,
        firstPoint: data[0],
        lastPoint: data[data.length - 1]
      });

      return data.map(bar => ({
        time: new Date(bar.time).getTime() / 1000,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume || 0
      }));
    } catch (error) {
      console.error('Error fetching initial data:', error);
      return [];
    }
  }

  private handleMessage(data: any) {
    console.log('Processing message:', data);

    if (data.type === 'trade') {
      const priceData: PriceData = {
        symbol: this.symbol,
        price: data.price,
        volume: data.volume,
        high: data.high || data.price,
        low: data.low || data.price
      };

      console.log('Price update:', priceData);
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
    console.log('Disconnecting from TradingView DataFeed');

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.subscribers.clear();
  }
}