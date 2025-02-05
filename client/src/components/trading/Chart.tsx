import { useEffect, useRef } from 'react';
import { useTrading } from '@/lib/trading-context';
import { useToast } from '@/hooks/use-toast';
import { TradingViewDataFeed } from '@/lib/tradingview-feed';

declare global {
  interface Window {
    TradingView: any;
  }
}

export default function Chart() {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<any>(null);
  const dataFeed = useRef<TradingViewDataFeed | null>(null);
  const { currentSymbol, updatePriceRange, updateTimeRange } = useTrading();
  const { toast } = useToast();

  useEffect(() => {
    if (!container.current) return;

    // Inicializar DataFeed
    dataFeed.current = new TradingViewDataFeed(currentSymbol);

    // Suscribirse a actualizaciones de escala
    dataFeed.current.onScaleUpdate((data) => {
      console.log('📊 Actualización de escala:', data);
      if (data.priceRange) {
        updatePriceRange({
          high: data.priceRange.high,
          low: data.priceRange.low,
          max: data.priceRange.max,
          min: data.priceRange.min
        });
      }
    });

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    script.onload = () => {
      if (!window.TradingView) return;

      try {
        widget.current = new window.TradingView.widget({
          container_id: container.current!.id,
          width: "100%",
          height: "100%",
          symbol: currentSymbol,
          interval: "1",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "es",
          enable_publishing: false,
          allow_symbol_change: true,
          save_image: true,
          studies: [
            "Volume@tv-basicstudies",
            "MAExp@tv-basicstudies",
            "VWAP@tv-basicstudies"
          ],
          disabled_features: ["header_symbol_search"],
          enabled_features: ["volume_force_overlay"],
          custom_css_url: './chart.css',
          datafeed: dataFeed.current,
          library_path: "charting_library/",
          onChartReady: () => {
            console.log('📈 Gráfico listo');
            const chart = widget.current.activeChart();

            // Configurar handlers adicionales para el gráfico
            chart.onVisibleRangeChanged().subscribe(null, (range: any) => {
              updateTimeRange({
                from: new Date(range.from * 1000),
                to: new Date(range.to * 1000),
                interval: chart.resolution()
              });
            });
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

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      if (dataFeed.current) {
        dataFeed.current.disconnect();
      }
    };
  }, [currentSymbol, updatePriceRange, updateTimeRange]);

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