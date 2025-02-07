import { tradingViewConfig } from '@/lib/config';

type Resolution = '1' | '5' | '15' | '60' | '240' | 'D';

interface TradeHistory {
  symbol: string;
  side: 'BUY' | 'SELL';
  price: string;
  qty: string;
  realizedPnl: string;
  commission: string;
  time: number;
}

export class BingXService {
  private static instance: BingXService;
  private apiKey: string = '';
  private apiSecret: string = '';
  private baseUrl: string = 'https://open-api.bingx.com/openApi/swap/v2';

  private constructor() {}

  public static getInstance(): BingXService {
    if (!BingXService.instance) {
      BingXService.instance = new BingXService();
    }
    return BingXService.instance;
  }

  public setApiCredentials(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  private async makeRequest(endpoint: string, method: string = 'GET', params: Record<string, any> = {}): Promise<any> {
    try {
      if (!this.apiKey || !this.apiSecret) {
        throw new Error('API credentials not set');
      }

      // Add required parameters
      const timestamp = Date.now();
      const allParams = {
        ...params,
        timestamp,
        apiKey: this.apiKey
      };

      // Sort parameters alphabetically and encode values
      const queryString = Object.entries(allParams)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => {
          // Ensure numeric values are converted to strings
          const stringValue = typeof value === 'number' ? value.toString() : value;
          return `${key}=${encodeURIComponent(stringValue)}`;
        })
        .join('&');

      console.log('Making request to endpoint:', endpoint);
      console.log('Query string before signing:', queryString);

      // Get signature from backend
      const signatureResponse = await fetch('/api/bingx/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          queryString,
          apiSecret: this.apiSecret
        })
      });

      if (!signatureResponse.ok) {
        const error = await signatureResponse.json();
        throw new Error(`Failed to get signature: ${error.details || error.error}`);
      }

      const { signature } = await signatureResponse.json();
      console.log('Received signature from server');

      const requestUrl = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;
      console.log('Making request to:', requestUrl);

      const response = await fetch(requestUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-BX-APIKEY': this.apiKey
        }
      });

      const data = await response.json();
      console.log('BingX API Response:', data);

      if (data.code === 0) {
        return data;
      } else {
        throw new Error(data.msg || `Request failed with code ${data.code}`);
      }
    } catch (error) {
      console.error('Error making request to BingX:', error);
      throw error;
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      console.log('Testing BingX API connection...');
      const response = await this.makeRequest('/openApi/swap/v2/user/balance');
      console.log('Test connection response:', response);
      return response.code === 0;
    } catch (error) {
      console.error('Error testing connection:', error);
      return false;
    }
  }

  public async getTradeHistory(symbol: string, startTime?: number, endTime?: number): Promise<TradeHistory[]> {
    try {
      const params: Record<string, any> = {
        symbol: symbol.toUpperCase(),
        limit: 1000
      };

      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;

      const response = await this.makeRequest('/trade/history', 'GET', params);
      return response.data;
    } catch (error) {
      console.error('Error fetching trade history:', error);
      throw error;
    }
  }

  public async getAccountSummary(): Promise<any> {
    try {
      const response = await this.makeRequest('/openApi/swap/v2/user/balance');
      return response.data;
    } catch (error) {
      console.error('Error fetching account summary:', error);
      throw error;
    }
  }

  public async getPositions(symbol?: string): Promise<any> {
    try {
      const params: Record<string, any> = {};
      if (symbol) params.symbol = symbol.toUpperCase();

      const response = await this.makeRequest('/position/list', 'GET', params);
      return response.data;
    } catch (error) {
      console.error('Error fetching positions:', error);
      throw error;
    }
  }

  public async calculatePnLMetrics(symbol: string, startTime: number, endTime: number): Promise<{
    totalPnL: number;
    winRate: number;
    winningStreak: number;
    losingStreak: number;
    avgWinAmount: number;
    avgLossAmount: number;
    totalTrades: number;
    profitableTrades: number;
    unprofitableTrades: number;
  }> {
    try {
      const [trades, positions] = await Promise.all([
        this.getTradeHistory(symbol, startTime, endTime),
        this.getPositions(symbol)
      ]);

      console.log('Retrieved trades:', trades);
      console.log('Current positions:', positions);

      let totalPnL = 0;
      let profitableTrades = 0;
      let currentWinStreak = 0;
      let currentLoseStreak = 0;
      let maxWinStreak = 0;
      let maxLoseStreak = 0;
      let totalWinAmount = 0;
      let totalLossAmount = 0;

      trades.forEach(trade => {
        const pnl = parseFloat(trade.realizedPnl);
        totalPnL += pnl;

        if (pnl > 0) {
          profitableTrades++;
          totalWinAmount += pnl;
          currentWinStreak++;
          currentLoseStreak = 0;
          maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
        } else if (pnl < 0) {
          totalLossAmount += Math.abs(pnl);
          currentLoseStreak++;
          currentWinStreak = 0;
          maxLoseStreak = Math.max(maxLoseStreak, currentLoseStreak);
        }
      });

      // Add unrealized PnL from open positions
      if (positions) {
        positions.forEach((position: any) => {
          if (position.symbol === symbol) {
            totalPnL += parseFloat(position.unrealizedPnl);
          }
        });
      }

      const totalTrades = trades.length;
      const unprofitableTrades = totalTrades - profitableTrades;
      const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
      const avgWinAmount = profitableTrades > 0 ? totalWinAmount / profitableTrades : 0;
      const avgLossAmount = unprofitableTrades > 0 ? totalLossAmount / unprofitableTrades : 0;

      return {
        totalPnL,
        winRate,
        winningStreak: maxWinStreak,
        losingStreak: maxLoseStreak,
        avgWinAmount,
        avgLossAmount,
        totalTrades,
        profitableTrades,
        unprofitableTrades
      };
    } catch (error) {
      console.error('Error calculating PnL metrics:', error);
      throw error;
    }
  }
}

export const bingXService = BingXService.getInstance();