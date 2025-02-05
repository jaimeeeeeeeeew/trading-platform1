import { z } from 'zod';

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

// Validación de respuesta de TradingView
const barSchema = z.object({
  t: z.array(z.number()),
  o: z.array(z.number()),
  h: z.array(z.number()),
  l: z.array(z.number()),
  c: z.array(z.number()),
  v: z.array(z.number()).optional(),
});

class TradingViewService {
  private static instance: TradingViewService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = 'https://demo_feed.tradingview.com'; // URL real de TradingView
  }

  public static getInstance(): TradingViewService {
    if (!TradingViewService.instance) {
      TradingViewService.instance = new TradingViewService();
    }
    return TradingViewService.instance;
  }

  async getHistory({ symbol, resolution, from, to, countback }: HistoryParams): Promise<Bar[]> {
    try {
      const params = new URLSearchParams({
        symbol,
        resolution,
        from: from.toString(),
        to: to.toString(),
        countback: countback?.toString() || '2000'
      });

      const response = await fetch(`${this.baseUrl}/history?${params}`);
      const data = await response.json();

      const parsed = barSchema.parse(data);

      return parsed.t.map((timestamp, index) => ({
        time: new Date(timestamp * 1000).toISOString().split('T')[0],
        open: parsed.o[index],
        high: parsed.h[index],
        low: parsed.l[index],
        close: parsed.c[index],
        ...(parsed.v && { volume: parsed.v[index] }),
      }));
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