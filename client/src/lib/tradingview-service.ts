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
    // This will be replaced with actual TradingView UDF endpoint
    this.baseUrl = '/api/tradingview';
  }

  public static getInstance(): TradingViewService {
    if (!TradingViewService.instance) {
      TradingViewService.instance = new TradingViewService();
    }
    return TradingViewService.instance;
  }

  async getHistory({ symbol, resolution, from, to, countback }: HistoryParams): Promise<Bar[]> {
    try {
      // This is a placeholder that will be replaced with actual API call
      // For now, return empty array to prevent errors
      return [];
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
