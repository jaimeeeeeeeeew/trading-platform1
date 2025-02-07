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
    this.baseUrl = '/api/tradingview';
  }

  public static getInstance(): TradingViewService {
    if (!TradingViewService.instance) {
      TradingViewService.instance = new TradingViewService();
    }
    return TradingViewService.instance;
  }

  private formatSymbolForBinance(symbol: string): string {
    return symbol
      .toUpperCase()
      .replace('BINANCE:', '')
      .replace('PERP', '');
  }

  public intervalToResolution(interval: string): Resolution {
    // Mapeo directo de intervalos de trading a resoluciones de TradingView
    const map: Record<string, Resolution> = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '1h': '60',
      '4h': '240',
      '1d': 'D',
    };
    const resolution = map[interval];
    if (!resolution) {
      console.error('Invalid interval:', interval);
      return '1';  // Default a 1 minuto si no se encuentra
    }
    return resolution;
  }

  private resolutionToBinanceInterval(resolution: Resolution): string {
    // Mapeo directo de resoluciones de TradingView a intervalos de Binance
    const map: Record<Resolution, string> = {
      '1': '1m',
      '5': '5m',
      '15': '15m',
      '60': '1h',
      '240': '4h',
      'D': '1d'
    };
    const interval = map[resolution];
    if (!interval) {
      console.error('Invalid resolution:', resolution);
      return '1m';  // Default a 1 minuto si no se encuentra
    }
    return interval;
  }

  async getHistory({ symbol, resolution, from, to, countback }: HistoryParams): Promise<Bar[]> {
    try {
      const formattedSymbol = this.formatSymbolForBinance(symbol);
      const binanceInterval = this.resolutionToBinanceInterval(resolution);
      console.log('Fetching history for:', formattedSymbol, 'resolution:', resolution, 'binance interval:', binanceInterval);

      // Calculate time segments to fetch more historical data
      const timeSegments = [];
      const segmentSize = 1000; // Binance limit per request
      const timeRange = to - from;
      const minutesPerCandle = parseInt(resolution) || (resolution === 'D' ? 1440 : 1);
      const numberOfSegments = Math.ceil(timeRange / (segmentSize * minutesPerCandle * 60));

      for (let i = 0; i < numberOfSegments; i++) {
        const segmentTo = to - (i * segmentSize * minutesPerCandle * 60);
        const segmentFrom = Math.max(from, segmentTo - (segmentSize * minutesPerCandle * 60));
        timeSegments.push({ from: segmentFrom, to: segmentTo });
      }

      console.log(`Fetching ${timeSegments.length} segments of historical data`);

      // Fetch data for each time segment
      const responses = await Promise.all(
        timeSegments.map(segment =>
          fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${formattedSymbol}&interval=${binanceInterval}&limit=1000&startTime=${segment.from * 1000}&endTime=${segment.to * 1000}`)
            .then(response => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              return response.json();
            })
        )
      );

      const allData = await Promise.all(responses);

      // Flatten and sort all segments
      const sortedData = allData
        .flat()
        .sort((a, b) => a[0] - b[0])
        .filter((value, index, self) =>
          index === 0 || value[0] !== self[index - 1][0]
        );

      console.log(`Received ${sortedData.length} total candles for interval ${binanceInterval}`);

      // Transform to Bar format
      return sortedData.map(d => ({
        time: (d[0] / 1000).toString(),
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5])
      }));

    } catch (error) {
      console.error('Error fetching history:', error);
      throw error;
    }
  }
}

export const tradingViewService = TradingViewService.getInstance();