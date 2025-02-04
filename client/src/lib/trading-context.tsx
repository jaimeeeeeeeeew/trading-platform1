import { createContext, useContext, useState, ReactNode } from 'react';

interface PriceRange {
  high: number;
  low: number;
}

interface TimeRange {
  from: Date;
  to: Date;
  interval: string;
}

interface TradingContextType {
  currentSymbol: string;
  setCurrentSymbol: (symbol: string) => void;
  visiblePriceRange: PriceRange;
  updatePriceRange: (range: PriceRange) => void;
  timeRange: TimeRange | null;
  updateTimeRange: (range: TimeRange) => void;
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
    low: 0
  });

  const [timeRange, setTimeRange] = useState<TimeRange | null>(null);

  const handleSymbolChange = (symbol: string) => {
    console.log('TradingContext - setCurrentSymbol llamado con:', symbol);
    localStorage.setItem(STORAGE_KEY, symbol);
    setCurrentSymbol(symbol);
  };

  const updatePriceRange = (range: PriceRange) => {
    console.log('TradingContext - updatePriceRange llamado con:', range);
    setVisiblePriceRange(range);
  };

  const updateTimeRange = (range: TimeRange) => {
    console.log('TradingContext - updateTimeRange llamado con:', range);
    setTimeRange(range);
  };

  return (
    <TradingContext.Provider 
      value={{ 
        currentSymbol, 
        setCurrentSymbol: handleSymbolChange,
        visiblePriceRange,
        updatePriceRange,
        timeRange,
        updateTimeRange
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