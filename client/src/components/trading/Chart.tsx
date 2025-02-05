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

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    script.onload = () => {
      if (!window.TradingView) return;

      try {
        widget.current = new window.TradingView.widget({
          // Configuración básica
          container_id: container.current!.id,
          width: "100%",
          height: "100%",
          symbol: currentSymbol,
          interval: "1",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "es",
          toolbar_bg: "#f1f3f6",

          // Estudios y herramientas
          drawings_access: { type: 'all', tools: [ { name: "Regression Trend" } ] },
          studies: [
            "MASimple@tv-basicstudies",
            "Volume@tv-basicstudies",
            "VWAP@tv-basicstudies"
          ],

          // Características habilitadas/deshabilitadas
          disabled_features: [
            "header_symbol_search",
            "header_saveload",
            "header_screenshot",
          ],
          enabled_features: [
            "study_templates",
            "show_chart_property_page",
            "volume_force_overlay",
            "create_volume_indicator_by_default",
            "hide_left_toolbar_by_default",
            "move_logo_to_main_pane",
            "two_charts_support",
            "chart_crosshair_menu",
            "display_market_status",
            "remove_library_container_border",
          ],

          // Opciones avanzadas
          fullscreen: false,
          autosize: true,
          custom_css_url: './chart.css',
          library_path: "/charting_library/",
          charts_storage_url: 'https://saveload.tradingview.com',
          charts_storage_api_version: "1.1",
          client_id: 'tradingview.com',
          user_id: 'public_user_id',
          loading_screen: { backgroundColor: "#1a1a1a" },

          // Eventos y callbacks
          onChartReady: () => {
            console.log('📈 TradingView Chart Ready');
            const chart = widget.current.activeChart();

            // Obtener datos del gráfico
            chart.onVisibleRangeChanged().subscribe(null, (range: any) => {
              console.log('📊 Visible range changed:', range);
              const from = new Date(range.from * 1000);
              const to = new Date(range.to * 1000);
              updateTimeRange({
                from,
                to,
                interval: chart.resolution()
              });
            });

            // Obtener precios actual
            chart.crosshairMoved().subscribe(null, (param: any) => {
              if (param.price) {
                updatePriceRange({
                  high: param.price * 1.001,
                  low: param.price * 0.999,
                  max: param.price * 1.01,
                  min: param.price * 0.99
                });
              }
            });

            // Ejemplo de dibujo básico
            setTimeout(() => {
              try {
                // Crear una línea de tendencia
                chart.createShape(
                  { 
                    time: Math.floor(Date.now() / 1000), 
                    price: chart.priceFormatter().format(param.price) 
                  },
                  {
                    shape: "trend_line",
                    lock: true,
                    disableSelection: false,
                    disableSave: false,
                    disableUndo: false,
                    text: "Tendencia",
                    overrides: {
                      linecolor: "#00ff00",
                      linewidth: 2,
                      linestyle: 0,
                      showLabel: true,
                      textcolor: "#ffffff",
                      fontsize: 12,
                      fontfamily: "Arial",
                      transparency: 0
                    }
                  }
                );

                console.log('✅ Dibujo creado exitosamente');
              } catch (error) {
                console.error('❌ Error al crear dibujo:', error);
              }
            }, 2000);
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