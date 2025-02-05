import { tradingViewConfig } from '@/lib/config';

type Resolution = '1' | '5' | '15' | '60' | '240' | 'D';

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

class TradingViewService {
  private static instance: TradingViewService;
  private baseUrl: string;

  private constructor() {
    // Use TradingView's public UDF endpoint
    this.baseUrl = 'https://demo_feed.tradingview.com';
  }

  public static getInstance(): TradingViewService {
    if (!TradingViewService.instance) {
      TradingViewService.instance = new TradingViewService();
    }
    return TradingViewService.instance;
  }

  async getHistory({ symbol, resolution, from, to, countback }: HistoryParams): Promise<Bar[]> {
    try {
      console.log('Fetching history for:', symbol, 'from:', from, 'to:', to);

      const url = new URL(`${this.baseUrl}/history`);
      url.searchParams.append('symbol', symbol);
      url.searchParams.append('resolution', resolution);
      url.searchParams.append('from', from.toString());
      url.searchParams.append('to', to.toString());
      if (countback) url.searchParams.append('countback', countback.toString());

      const response = await fetch(url.toString());
      const data = await response.json();

      console.log('Received data:', data);

      if (data.s === 'ok') {
        // Transformar los datos al formato que esperamos
        return data.t.map((timestamp: number, index: number) => ({
          time: new Date(timestamp * 1000).toISOString(),
          open: data.o[index],
          high: data.h[index],
          low: data.l[index],
          close: data.c[index],
          volume: data.v?.[index]
        }));
      } else {
        console.error('Error in TradingView response:', data);
        return [];
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      throw error;
    }
  }

  // Convert interval to TradingView resolution
  static intervalToResolution(interval: string): Resolution {
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