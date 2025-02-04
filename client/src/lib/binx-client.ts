import { createHmac } from 'crypto';

interface BinxConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

export class BinxClient {
  private config: BinxConfig;

  constructor(config: BinxConfig) {
    this.config = config;
  }

  private generateSignature(queryString: string): string {
    return createHmac('sha256', this.config.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  private async makeRequest(endpoint: string, method: string = 'GET', params: Record<string, any> = {}) {
    const timestamp = Date.now();
    const queryParams = new URLSearchParams({
      ...params,
      timestamp: timestamp.toString()
    }).toString();

    const signature = this.generateSignature(queryParams);
    const url = `${this.config.baseUrl}${endpoint}?${queryParams}&signature=${signature}`;

    const response = await fetch(url, {
      method,
      headers: {
        'X-API-KEY': this.config.apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error en la petición a BINX: ${response.statusText}`);
    }

    return response.json();
  }

  async getAccountInfo() {
    return this.makeRequest('/v1/account');
  }

  async getOpenOrders(symbol?: string) {
    return this.makeRequest('/v1/openOrders', 'GET', { symbol });
  }

  async getTradeHistory(symbol: string, limit: number = 50) {
    return this.makeRequest('/v1/trades', 'GET', { symbol, limit });
  }

  async getPnL(startTime: number, endTime: number) {
    return this.makeRequest('/v1/pnl', 'GET', { startTime, endTime });
  }

  async getMarketData(symbol: string) {
    return this.makeRequest('/v1/marketData', 'GET', { symbol });
  }
}

export const createBinxClient = () => {
  if (!process.env.BINX_API_KEY || !process.env.BINX_API_SECRET) {
    throw new Error('BINX API credentials are required');
  }

  return new BinxClient({
    apiKey: process.env.BINX_API_KEY,
    apiSecret: process.env.BINX_API_SECRET,
    baseUrl: 'https://api.binx.com'
  });
};
