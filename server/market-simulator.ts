import { MarketData } from '@shared/schema';

interface OrderBook {
  limitAsks: Array<{ price: number; volume: number }>;
  limitBids: Array<{ price: number; volume: number }>;
  marketBuys: Array<{ price: number; volume: number }>;
  marketSells: Array<{ price: number; volume: number }>;
}

interface MarketMetrics {
  direccion: number;
  dominancia: {
    left: number;
    right: number;
  };
  delta_futuros: {
    positivo: number;
    negativo: number;
  };
  delta_spot: {
    positivo: number;
    negativo: number;
  };
  transacciones: Array<{
    volume: string;
    price: string;
  }>;
}

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];
const BASE_PRICES = {
  BTCUSDT: 43000,
  ETHUSDT: 2300,
  SOLUSDT: 95,
  XRPUSDT: 0.52
} as const;

function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

function generateVolume(price: number): number {
  const baseVolume = price < 1 ? 10000 : price < 100 ? 1000 : price < 1000 ? 100 : 1;
  return Math.max(0.001, randomNormal(baseVolume, baseVolume * 0.3));
}

function generateMetrics(basePrice: number): MarketMetrics {
  const trend = Math.random() - 0.5;  // Tendencia aleatoria

  // Dominancia
  const totalDominancia = 20000;
  const dominanciaLeft = Math.max(0, Math.min(totalDominancia, 
    totalDominancia * (0.5 + trend + randomNormal(0, 0.1))
  ));

  // Delta futuros
  const deltaTotal = 1000;
  const deltaPositivo = Math.max(0, Math.min(deltaTotal,
    deltaTotal * (0.5 + trend + randomNormal(0, 0.15))
  ));

  // Transacciones
  const numTransactions = Math.floor(randomNormal(5, 1));
  const transacciones = Array.from({ length: numTransactions }, () => ({
    volume: `${Math.floor(randomNormal(500, 100))}K`,
    price: (basePrice * (1 + randomNormal(0, 0.0001))).toFixed(2)
  }));

  return {
    direccion: Math.round(basePrice),
    dominancia: {
      left: Math.round(dominanciaLeft),
      right: Math.round(totalDominancia - dominanciaLeft)
    },
    delta_futuros: {
      positivo: Math.round(deltaPositivo),
      negativo: Math.round(deltaTotal - deltaPositivo)
    },
    delta_spot: {
      positivo: Math.round(deltaPositivo * 0.8),
      negativo: Math.round((deltaTotal - deltaPositivo) * 0.8)
    },
    transacciones
  };
}

function generateOrderBook(basePrice: number): OrderBook {
  const numOrders = 15;
  const spread = basePrice * 0.0002;

  const limitAsks = Array.from({ length: numOrders }, (_, i) => ({
    price: basePrice + spread + (basePrice * 0.0001 * (i + 1)),
    volume: generateVolume(basePrice)
  }));

  const limitBids = Array.from({ length: numOrders }, (_, i) => ({
    price: basePrice - spread - (basePrice * 0.0001 * (i + 1)),
    volume: generateVolume(basePrice)
  }));

  const marketBuys = Array.from({ length: 3 }, () => ({
    price: basePrice + randomNormal(0, spread),
    volume: generateVolume(basePrice) * 1.5
  }));

  const marketSells = Array.from({ length: 3 }, () => ({
    price: basePrice - randomNormal(0, spread),
    volume: generateVolume(basePrice) * 1.5
  }));

  return { limitAsks, limitBids, marketBuys, marketSells };
}

export function generateMarketData(): Record<string, OrderBook & MarketMetrics> {
  const marketData: Record<string, OrderBook & MarketMetrics> = {};

  for (const symbol of SYMBOLS) {
    const basePrice = BASE_PRICES[symbol as keyof typeof BASE_PRICES];
    const orderBook = generateOrderBook(basePrice);
    const metrics = generateMetrics(basePrice);
    marketData[symbol] = { ...orderBook, ...metrics };
  }

  return marketData;
}

export function updateBasePrices(): void {
  for (const symbol of SYMBOLS) {
    const key = symbol as keyof typeof BASE_PRICES;
    const currentPrice = BASE_PRICES[key];
    const volatility = currentPrice * 0.0005;
    BASE_PRICES[key] = currentPrice + randomNormal(0, volatility);
  }
}