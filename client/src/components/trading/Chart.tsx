import { useEffect, useRef } from 'react';
import { useCryptoStore } from '@/hooks/useCryptoData';

declare global {
  interface Window {
    TradingView: any;
  }
}

export default function Chart() {
  const container = useRef<HTMLDivElement>(null);
  const { setSelectedSymbol } = useCryptoStore();

  useEffect(() => {
    if (!container.current) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      const widget = new window.TradingView.widget({
        container_id: container.current!.id,
        width: "100%",
        height: "100%",
        symbol: "BINANCE:BTCUSDT",
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
      });

      // Agregar el listener para cambios de símbolo
      widget.onChartReady(() => {
        const chart = widget.chart();
        chart.onSymbolChanged().subscribe(null, (symbolInfo: any) => {
          const symbol = symbolInfo.name;
          if (symbol.includes('BTC')) {
            setSelectedSymbol('BTCUSDT');
          } else if (symbol.includes('ETH')) {
            setSelectedSymbol('ETHUSDT');
          } else if (symbol.includes('ADA')) {
            setSelectedSymbol('ADAUSDT');
          }
        });
      });
    };

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [setSelectedSymbol]);

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