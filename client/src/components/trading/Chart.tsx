import { useEffect, useRef } from 'react';
import { useTrading } from '@/lib/trading-context';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    TradingView: any;
  }
}

export default function Chart() {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<any>(null);
  const chart = useRef<any>(null);
  const { currentSymbol, updatePriceRange } = useTrading();
  const { toast } = useToast();

  const updateVisiblePriceRange = () => {
    if (!chart.current) return;

    try {
      const priceScale = chart.current.priceScale('right');
      const mainSeries = chart.current.mainSeries();

      if (priceScale && mainSeries) {
        const visibleBars = mainSeries.barsInLogicalRange(
          chart.current.timeScale().getVisibleLogicalRange()
        );

        if (visibleBars) {
          const priceFormatter = mainSeries.priceFormatter();
          const highPrice = priceFormatter.format(visibleBars.high);
          const lowPrice = priceFormatter.format(visibleBars.low);

          // Actualizar el contexto con el nuevo rango de precios
          updatePriceRange({
            high: parseFloat(highPrice),
            low: parseFloat(lowPrice)
          });

          console.log('📊 Rango de precios visible:', { high: highPrice, low: lowPrice });
        }
      }
    } catch (error) {
      console.error('Error al obtener rango de precios:', error);
    }
  };

  useEffect(() => {
    if (!container.current) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    script.onload = () => {
      try {
        widget.current = new window.TradingView.widget({
          container_id: container.current!.id,
          width: "100%",
          height: "100%",
          symbol: "BINANCE:BTCUSDT",
          interval: "1",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "es",
          enable_publishing: false,
          allow_symbol_change: true,
          studies: ["RSI@tv-basicstudies"],
          save_image: true,
          onChartReady: () => {
            console.log('📊 Chart listo');
            chart.current = widget.current.chart();

            // Configurar eventos para actualizar el rango de precios
            chart.current.onVisibleRangeChanged().subscribe(null, () => {
              updateVisiblePriceRange();
            });

            if (currentSymbol) {
              const symbolToUse = currentSymbol.includes(':') ? currentSymbol : `BINANCE:${currentSymbol}`;
              widget.current.setSymbol(symbolToUse);
            }

            // Actualizar rango inicial
            updateVisiblePriceRange();
          }
        });

      } catch (error) {
        console.error('❌ Error al crear widget:', error);
        toast({
          title: "Error",
          description: "No se pudo inicializar el gráfico",
          duration: 3000,
        });
      }
    };

    script.onerror = () => {
      toast({
        title: "Error",
        description: "No se pudo cargar TradingView",
        duration: 3000,
      });
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [currentSymbol]); 

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