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

interface BufferItem {
  timestamp: number;
  data: Bar | PriceData;
  type: 'kline' | 'price';
}

export class TradingViewDataFeed {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, (data: any) => void> = new Map();
  private symbol: string;
  private interval: string;
  private lastBar: Bar | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10; // Aumentado para más intentos
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;
  private connectionState: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  private dataBuffer: BufferItem[] = [];
  private readonly maxBufferSize: number = 1000;
  private lastProcessedTimestamp: number = 0;

  constructor(symbol: string, interval: string = '1m') {
    this.symbol = symbol.toLowerCase().replace(':', '').replace('perp', '');
    this.interval = interval;
    console.log('🚀 Initializing Binance Futures WebSocket for:', this.symbol, 'interval:', interval);
    this.connect();
  }

  private connect() {
    try {
      if (this.isReconnecting) {
        console.log('🔄 Already attempting to reconnect...');
        return;
      }

      this.isReconnecting = true;
      this.connectionState = 'connecting';

      const wsUrl = `wss://fstream.binance.com/ws/${this.symbol}@aggTrade/${this.symbol}@kline_${this.interval}`;
      console.log('🔌 Connecting WebSocket:', wsUrl);

      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected for interval:', this.interval);
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
        this.processBufferedData();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.bufferData(data);
        } catch (error) {
          console.error('❌ Error processing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('⚠️ WebSocket error:', error);
        this.connectionState = 'error';
        this.handleReconnect();
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.connectionState = 'disconnected';
        this.handleReconnect();
      };

    } catch (error) {
      console.error('❌ Error establishing WebSocket connection:', error);
      this.connectionState = 'error';
      this.handleReconnect();
    }
  }

  private bufferData(data: any) {
    if (data.e === 'kline' && data.k.i === this.interval) {
      const kline = data.k;
      const bar: Bar = {
        time: Math.floor(kline.t / 1000),
        open: parseFloat(kline.o),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l),
        close: parseFloat(kline.c),
        volume: parseFloat(kline.v)
      };

      this.dataBuffer.push({
        timestamp: Date.now(),
        data: bar,
        type: 'kline'
      });

      // Procesar inmediatamente si estamos conectados
      if (this.connectionState === 'connected') {
        this.processBufferedData();
      }
    }

    // Mantener el buffer dentro del límite
    if (this.dataBuffer.length > this.maxBufferSize) {
      this.dataBuffer = this.dataBuffer.slice(-this.maxBufferSize);
    }
  }

  private processBufferedData() {
    if (this.connectionState !== 'connected') return;

    const now = Date.now();
    const processableData = this.dataBuffer.filter(
      item => item.timestamp > this.lastProcessedTimestamp
    );

    processableData.forEach(item => {
      if (item.type === 'kline') {
        this.handleBinanceMessage({
          e: 'kline',
          k: item.data
        });
      }
    });

    this.lastProcessedTimestamp = now;
    this.dataBuffer = this.dataBuffer.slice(-this.maxBufferSize);
  }

  private handleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);

      this.reconnectTimeout = setTimeout(() => {
        this.isReconnecting = false;
        this.connect();
      }, delay);
    } else {
      console.log('🔄 Max reconnection attempts reached, stopping...');
      this.connectionState = 'error';
      this.isReconnecting = false;
    }
  }

  private handleBinanceMessage(data: any) {
    if (data.e === 'kline') {
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

      const priceData: PriceData = {
        symbol: this.symbol,
        price: parseFloat(kline.c),
        volume: parseFloat(kline.v),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l)
      };

      this.notifySubscribers('price', priceData);
      this.notifySubscribers('kline', bar);
    }
  }

  public onPriceUpdate(callback: (data: PriceData) => void) {
    this.subscribers.set('price', callback);
  }

  public onKlineUpdate(callback: (data: Bar) => void) {
    this.subscribers.set('kline', callback);
  }

  public updateInterval(newInterval: string) {
    if (this.interval !== newInterval) {
      console.log('🔄 Updating interval from', this.interval, 'to', newInterval);
      this.interval = newInterval;
      this.disconnect();
      setTimeout(() => {
        this.isReconnecting = false;
        this.connect();
      }, 100);
    }
  }

  private notifySubscribers(type: string, data: any) {
    const callback = this.subscribers.get(type);
    if (callback) {
      callback(data);
    }
  }

  public disconnect() {
    console.log('🧹 Cleaning up socket connection');
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.isReconnecting = false;
    this.connectionState = 'disconnected';
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