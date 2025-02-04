import { useEffect, useRef } from 'react';
import { useTrading } from '@/lib/trading-context';

declare global {
  interface Window {
    TradingView: any;
  }
}

export default function Chart() {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<any>(null);
  const { currentSymbol, setCurrentSymbol } = useTrading();

  useEffect(() => {
    if (!container.current) return;

    console.log('Inicializando TradingView widget con símbolo:', currentSymbol);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      console.log('Script de TradingView cargado, creando widget...');

      widget.current = new window.TradingView.widget({
        container_id: container.current!.id,
        width: "100%",
        height: "100%",
        symbol: currentSymbol,
        interval: "D",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "es",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        studies: [
          "Volume@tv-basicstudies",
          "VWAP@tv-basicstudies"
        ],
        supported_resolutions: ["1", "5", "15", "30", "60", "D", "W"],
        // Detectar cambios de símbolo
        onSymbolChange: (symbol: string) => {
          console.log('TradingView - Símbolo cambiado a:', symbol);
          setCurrentSymbol(symbol);
        },
        // Agregar callback cuando el widget está listo
        onChartReady: () => {
          console.log('TradingView chart listo, símbolo actual:', widget.current?.symbolInterval?.().symbol);
        }
      });
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [currentSymbol, setCurrentSymbol]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border bg-card">
      <div
        id="tradingview_widget"
        ref={container}
        className="w-full h-full"
      />
    </div>
  );
}