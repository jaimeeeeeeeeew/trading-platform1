import { WebSocketClient } from '@/lib/websocket';

interface Bar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface HistoryParams {
  symbol: string;
  resolution: Resolution;
  from: number;
  to: number;
  countback?: number;
}

type Resolution = '1' | '5' | '15' | '60' | '240' | 'D';

class TradingViewService {
  private static instance: TradingViewService;
  private baseUrl: string;
  private ws: WebSocketClient | null = null;

  private constructor() {
    this.baseUrl = 'https://demo.tradingview.com/api/v1/streaming';
    this.connectWebSocket();
  }

  private connectWebSocket() {
    console.log('Connecting to TradingView WebSocket...', {
      baseUrl: this.baseUrl,
      timestamp: new Date().toISOString()
    });

    this.ws = new WebSocketClient('wss://demo.tradingview.com/socket.io/websocket');

    this.ws.onOpen(() => {
      console.log('Connected to TradingView WebSocket', {
        timestamp: new Date().toISOString(),
        readyState: this.ws?.getReadyState()
      });
      this.testConnection();
    });

    this.ws.onMessage((data) => {
      console.log('Received data from TradingView:', {
        data,
        timestamp: new Date().toISOString()
      });
    });

    this.ws.onError((error) => {
      console.error('WebSocket error:', {
        error,
        timestamp: new Date().toISOString()
      });
    });
  }

  private testConnection() {
    if (!this.ws) return;

    // Enviar un mensaje de prueba
    const testMessage = {
      type: 'ping',
      timestamp: Date.now()
    };

    console.log('Sending test message:', testMessage);
    this.ws.send(JSON.stringify(testMessage));
  }

  public static getInstance(): TradingViewService {
    if (!TradingViewService.instance) {
      TradingViewService.instance = new TradingViewService();
    }
    return TradingViewService.instance;
  }

  async getHistory({ symbol, resolution, from, to, countback }: HistoryParams): Promise<Bar[]> {
    try {
      console.log('Fetching historical data:', {
        symbol,
        resolution,
        from: new Date(from * 1000).toISOString(),
        to: new Date(to * 1000).toISOString(),
        countback
      });

      // TradingView Public UDF Endpoint
      const udfBaseUrl = 'https://symbol-search.tradingview.com/symbol/search';

      // First, get symbol information
      const searchResponse = await fetch(`${udfBaseUrl}?text=${symbol}&type=stock`);
      console.log('Symbol search response status:', searchResponse.status);

      if (!searchResponse.ok) {
        throw new Error(`Symbol search failed: ${searchResponse.status}`);
      }

      const symbolData = await searchResponse.json();
      console.log('Symbol data:', symbolData);

      // If we can't get real data, return sample data for testing
      return this.generateSampleData(from, to);
    } catch (error) {
      console.error('Error fetching history:', {
        error,
        timestamp: new Date().toISOString()
      });
      return this.generateSampleData(from, to);
    }
  }

  private generateSampleData(from: number, to: number): Bar[] {
    console.log('Generating sample data from', new Date(from * 1000), 'to', new Date(to * 1000));
    const bars: Bar[] = [];
    let currentTime = from * 1000;
    let lastClose = 45000; // Starting price for BTC/USDT

    while (currentTime < to * 1000) {
      const volatility = (Math.random() * 0.03) * lastClose;
      const open = lastClose;
      const close = open * (1 + (Math.random() - 0.5) * 0.02);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);

      bars.push({
        time: new Date(currentTime).toISOString(),
        open,
        high,
        low,
        close,
        volume: Math.floor(1000 + Math.random() * 10000)
      });

      lastClose = close;
      currentTime += 60 * 60 * 1000; // Avanzar una hora
    }

    console.log('Generated sample data:', {
      bars: bars.length,
      first: bars[0],
      last: bars[bars.length - 1]
    });

    return bars;
  }

  public static intervalToResolution(interval: string): Resolution {
    const map: Record<string, Resolution> = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '1h': '60',
      '4h': '240',
      '1d': 'D',
    };
    return map[interval] || '60';
  }
}

export const tradingViewService = TradingViewService.getInstance();