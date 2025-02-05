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
  const { currentSymbol, updatePriceRange, updateTimeRange } = useTrading();
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔄 Iniciando efecto para cargar TradingView');
    if (!container.current) {
      console.error('❌ Container ref no disponible');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    script.onload = () => {
      console.log('✅ Script de TradingView cargado');
      console.log('TradingView disponible:', !!window.TradingView);

      if (!window.TradingView) {
        console.error('❌ TradingView no disponible en window');
        return;
      }

      try {
        console.log('🎯 Intentando crear widget de TradingView');
        console.log('ID del contenedor:', container.current!.id);

        widget.current = new window.TradingView.widget({
          container_id: container.current!.id,
          width: "100%",
          height: "100%",
          symbol: currentSymbol || "BINANCE:BTCUSDT",
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
          onChartReady: () => {
            const chart = widget.current.activeChart();

            // Obtener el rango visible inicial
            const visibleRange = chart.getVisibleRange();
            console.log('📊 Rango visible inicial:', visibleRange);

            if (visibleRange) {
              updateTimeRange({
                from: new Date(visibleRange.from * 1000),
                to: new Date(visibleRange.to * 1000),
                interval: chart.resolution()
              });
            }

            // Obtener precios máximo y mínimo visibles
            const scaleProperties = chart.getScaleProperties();
            if (scaleProperties) {
              const priceRange = {
                high: chart.priceFormatter().format(scaleProperties.priceRange.high),
                low: chart.priceFormatter().format(scaleProperties.priceRange.low),
                max: chart.priceFormatter().format(scaleProperties.priceRange.maxValue),
                min: chart.priceFormatter().format(scaleProperties.priceRange.minValue)
              };
              console.log('📊 Rango de precios:', priceRange);
              updatePriceRange(priceRange);
            }

            // Suscribirse a cambios en el rango visible
            chart.onVisibleRangeChanged().subscribe(null, (range: any) => {
              console.log('📊 Rango visible cambió:', range);
              updateTimeRange({
                from: new Date(range.from * 1000),
                to: new Date(range.to * 1000),
                interval: chart.resolution()
              });

              // Actualizar precios máximo y mínimo cuando cambia el rango
              const scaleProps = chart.getScaleProperties();
              if (scaleProps) {
                const newPriceRange = {
                  high: chart.priceFormatter().format(scaleProps.priceRange.high),
                  low: chart.priceFormatter().format(scaleProps.priceRange.low),
                  max: chart.priceFormatter().format(scaleProps.priceRange.maxValue),
                  min: chart.priceFormatter().format(scaleProps.priceRange.minValue)
                };
                console.log('📊 Nuevo rango de precios:', newPriceRange);
                updatePriceRange(newPriceRange);
              }
            });

            // Suscribirse a cambios de precio
            chart.crosshairMoved().subscribe(null, (param: any) => {
              if (param.price) {
                console.log('📊 Precio actual:', param.price);
                const scaleProps = chart.getScaleProperties();
                if (scaleProps) {
                  const currentPriceRange = {
                    high: param.price * 1.001,
                    low: param.price * 0.999,
                    max: chart.priceFormatter().format(scaleProps.priceRange.maxValue),
                    min: chart.priceFormatter().format(scaleProps.priceRange.minValue)
                  };
                  updatePriceRange(currentPriceRange);
                }
              }
            });
          }
        });

        console.log('✅ Widget creado exitosamente');

      } catch (error) {
        console.error('❌ Error al crear widget:', error);
        toast({
          title: "Error",
          description: "No se pudo inicializar el gráfico",
          duration: 3000,
        });
      }
    };

    script.onerror = (error) => {
      console.error('❌ Error al cargar script de TradingView:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar TradingView",
        duration: 3000,
      });
    };

    document.head.appendChild(script);
    console.log('✅ Script agregado al head');

    return () => {
      if (document.head.contains(script)) {
        console.log('🧹 Limpiando script de TradingView');
        document.head.removeChild(script);
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