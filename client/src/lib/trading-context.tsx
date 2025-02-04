import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface TradingContextType {
  currentSymbol: string;
  setCurrentSymbol: (symbol: string) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const STORAGE_KEY = 'trading_symbol';

export function TradingProvider({ children }: { children: ReactNode }) {
  // Intentar cargar el símbolo guardado, si no existe usar el default
  const [currentSymbol, setCurrentSymbol] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || 'BINANCE:BTCUSDT';
  });

  useEffect(() => {
    // Guardar el símbolo en localStorage cuando cambie
    localStorage.setItem(STORAGE_KEY, currentSymbol);
    console.log('TradingContext - Símbolo actualizado y guardado:', currentSymbol);
  }, [currentSymbol]);

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