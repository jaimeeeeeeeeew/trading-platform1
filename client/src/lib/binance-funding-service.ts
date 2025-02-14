import { WebSocket } from 'ws';

interface FundingRateData {
  rates: number[];
  timestamps: number[];
}

class BinanceFundingService {
  private static instance: BinanceFundingService;
  private ws: WebSocket | null = null;
  private symbol: string;
  private historicalData: FundingRateData = {
    rates: [],
    timestamps: []
  };

  private constructor() {
    this.symbol = 'BTCUSDT';
  }

  public static getInstance(): BinanceFundingService {
    if (!BinanceFundingService.instance) {
      BinanceFundingService.instance = new BinanceFundingService();
    }
    return BinanceFundingService.instance;
  }

  public async getHistoricalFundingRate(): Promise<FundingRateData> {
    try {
      // Obtener datos históricos de los últimos 30 días
      const endTime = Date.now();
      const startTime = endTime - (30 * 24 * 60 * 60 * 1000); // 30 días atrás

      const response = await fetch(
        `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${this.symbol}&startTime=${startTime}&endTime=${endTime}&limit=1000`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Transformar los datos al formato que necesitamos
      const fundingData: FundingRateData = {
        rates: data.map((item: any) => parseFloat(item.fundingRate) * 100), // Convertir a porcentaje
        timestamps: data.map((item: any) => parseInt(item.fundingTime))
      };

      console.log('📊 Historical funding rate data loaded:', {
        dataPoints: fundingData.rates.length,
        firstRate: fundingData.rates[0],
        lastRate: fundingData.rates[fundingData.rates.length - 1]
      });

      this.historicalData = fundingData;
      return fundingData;

    } catch (error) {
      console.error('Error fetching funding rate:', error);
      return {
        rates: [],
        timestamps: []
      };
    }
  }

  public subscribeToFundingRate(callback: (data: FundingRateData) => void) {
    // Primero enviamos los datos históricos
    if (this.historicalData.rates.length > 0) {
      callback(this.historicalData);
    }

    // Luego nos suscribimos a actualizaciones en tiempo real
    const wsUrl = `wss://fstream.binance.com/ws/${this.symbol.toLowerCase()}@markPrice@1s`;
    
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('🔌 Connected to Binance WebSocket for funding rate');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data.toString());
        if (data.e === 'markPriceUpdate') {
          const fundingRate = parseFloat(data.r) * 100; // Convertir a porcentaje
          const timestamp = data.E;

          // Añadir nuevo dato al histórico
          this.historicalData.rates.push(fundingRate);
          this.historicalData.timestamps.push(timestamp);

          // Mantener solo los últimos 1000 puntos de datos
          if (this.historicalData.rates.length > 1000) {
            this.historicalData.rates = this.historicalData.rates.slice(-1000);
            this.historicalData.timestamps = this.historicalData.timestamps.slice(-1000);
          }

          callback(this.historicalData);
        }
      } catch (error) {
        console.error('Error processing funding rate message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
      // Reintentar conexión después de 5 segundos
      setTimeout(() => this.subscribeToFundingRate(callback), 5000);
    };
  }

  public unsubscribe() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public setSymbol(newSymbol: string) {
    this.symbol = newSymbol.toUpperCase();
  }
}

export const binanceFundingService = BinanceFundingService.getInstance();