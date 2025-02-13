import { createContext, useContext, useState, ReactNode } from 'react';

interface PriceRange {
  high: number;
  low: number;
  min: number;  // Precio mínimo visible en el gráfico
  max: number;  // Precio máximo visible en el gráfico
}

interface TimeRange {
  from: Date;
  to: Date;
  interval: string;
}

interface Order {
  id: string;  // Añadido id para identificación única
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: {
    value: number;
    distance: number;
  };
}

interface TradingContextType {
  currentSymbol: string;
  setCurrentSymbol: (symbol: string) => void;
  visiblePriceRange: PriceRange;
  updatePriceRange: (range: PriceRange) => void;
  timeRange: TimeRange | null;
  updateTimeRange: (range: TimeRange) => void;
  activeOrders: Order[];
  placeOrder: (order: Order) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const STORAGE_KEY = 'trading_symbol';

export function TradingProvider({ children }: { children: ReactNode }) {
  const [currentSymbol, setCurrentSymbol] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || 'BINANCE:BTCUSDT';
  });

  const [visiblePriceRange, setVisiblePriceRange] = useState<PriceRange>({
    high: 0,
    low: 0,
    min: 0,
    max: 0
  });

  const [timeRange, setTimeRange] = useState<TimeRange | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  const handleSymbolChange = (symbol: string) => {
    localStorage.setItem(STORAGE_KEY, symbol);
    setCurrentSymbol(symbol);
  };

  const updatePriceRange = (range: PriceRange) => {
    setVisiblePriceRange(range);
  };

  const updateTimeRange = (range: TimeRange) => {
    setTimeRange(range);
  };

  const placeOrder = async (order: Order) => {
    try {
      console.log('Colocando orden:', order);
      // Asegurarse de que la orden tiene un id único
      const orderWithId = {
        ...order,
        id: crypto.randomUUID()
      };
      setActiveOrders(prev => [...prev, orderWithId]);
    } catch (error) {
      console.error('Error al colocar la orden:', error);
      throw error;
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      console.log('Cancelando orden:', orderId);
      setActiveOrders(prev => prev.filter(order => order.id !== orderId));
    } catch (error) {
      console.error('Error al cancelar la orden:', error);
      throw error;
    }
  };

  return (
    <TradingContext.Provider 
      value={{ 
        currentSymbol, 
        setCurrentSymbol: handleSymbolChange,
        visiblePriceRange,
        updatePriceRange,
        timeRange,
        updateTimeRange,
        activeOrders,
        placeOrder,
        cancelOrder
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}

export function useTrading() {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
}