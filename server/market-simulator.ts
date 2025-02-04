import { MarketData } from '@shared/schema';

interface OrderBook {
  limitAsks: Array<{ price: number; volume: number }>;
  limitBids: Array<{ price: number; volume: number }>;
  marketBuys: Array<{ price: number; volume: number }>;
  marketSells: Array<{ price: number; volume: number }>;
}

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];
const BASE_PRICES = {
  BTCUSDT: 43000,
  ETHUSDT: 2300,
  SOLUSDT: 95,
  XRPUSDT: 0.52
};

// Genera un número aleatorio con desviación normal
function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

// Genera volumen aleatorio basado en el precio
function generateVolume(price: number): number {
  const baseVolume = price < 1 ? 10000 : price < 100 ? 1000 : price < 1000 ? 100 : 1;
  return Math.max(0.001, randomNormal(baseVolume, baseVolume * 0.3));
}

// Genera un libro de órdenes para un símbolo
function generateOrderBook(basePrice: number): OrderBook {
  const numOrders = 15; // Número de órdenes por lado
  const spread = basePrice * 0.0002; // Spread del 0.02%
  
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

// Genera datos de mercado simulados para todos los símbolos
export function generateMarketData(): Record<string, OrderBook> {
  const marketData: Record<string, OrderBook> = {};
  
  for (const symbol of SYMBOLS) {
    const basePrice = BASE_PRICES[symbol];
    marketData[symbol] = generateOrderBook(basePrice);
  }

  return marketData;
}

// Actualiza precios base con una tendencia aleatoria
export function updateBasePrices(): void {
  for (const symbol of SYMBOLS) {
    const currentPrice = BASE_PRICES[symbol];
    const volatility = currentPrice * 0.0005; // 0.05% de volatilidad base
    BASE_PRICES[symbol] = currentPrice + randomNormal(0, volatility);
  }
}
