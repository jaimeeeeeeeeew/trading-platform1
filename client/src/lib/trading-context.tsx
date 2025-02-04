import { createContext, useContext, useState, ReactNode } from 'react';

interface TradingContextType {
  currentSymbol: string;
  setCurrentSymbol: (symbol: string) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export function TradingProvider({ children }: { children: ReactNode }) {
  const [currentSymbol, setCurrentSymbol] = useState('BINANCE:BTCUSDT');

  return (
    <TradingContext.Provider value={{ currentSymbol, setCurrentSymbol }}>
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
