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
  const { currentSymbol } = useTrading();
  const { toast } = useToast();

  useEffect(() => {
    console.log('🚀 Iniciando componente Chart');

    if (!container.current) {
      console.error('❌ Container no encontrado');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    script.onload = () => {
      console.log('📦 Script de TradingView cargado');

      try {
        widget.current = new window.TradingView.widget({
          container_id: container.current!.id,
          width: "100%",
          height: "100%",
          symbol: "BTCUSDT",
          interval: "1",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "es",
          enable_publishing: false,
          allow_symbol_change: true,
          hide_side_toolbar: false,
          debug: true,
          autosize: true,
          studies: ["RSI@tv-basicstudies"],
          onChartReady: () => {
            console.log('📊 Chart listo - Comenzando recopilación de datos');

            const collectChartData = () => {
              try {
                if (!widget.current) {
                  console.warn('⚠️ Widget no disponible');
                  return;
                }

                const chart = widget.current.chart();
                if (!chart) {
                  console.warn('⚠️ Chart no disponible');
                  return;
                }

                // Información básica del gráfico
                const symbolInfo = {
                  symbol: chart.symbol(),
                  resolution: chart.resolution(),
                  timezone: chart.getTimezoneOffset(),
                };
                console.log('📈 Información del símbolo:', symbolInfo);

                // Información de precios
                try {
                  const priceData = chart.crosshairMove();
                  if (priceData) {
                    console.log('💰 Datos de precio actual:', priceData);
                  }
                } catch (e) {
                  console.warn('⚠️ No se pudo obtener precio actual:', e);
                }

                // Estudios técnicos
                try {
                  const studies = chart.getAllStudies();
                  console.log('📊 Estudios técnicos:', studies);
                } catch (e) {
                  console.warn('⚠️ No se pudo obtener estudios:', e);
                }

                // Series de precios
                try {
                  const mainSeries = chart.mainSeries();
                  if (mainSeries) {
                    console.log('📉 Serie principal:', {
                      visible: mainSeries.isVisible(),
                      style: mainSeries.style(),
                    });
                  }
                } catch (e) {
                  console.warn('⚠️ No se pudo obtener serie principal:', e);
                }

                // Marcadores y líneas
                try {
                  const shapes = chart.getAllShapes();
                  console.log('🔷 Formas en el gráfico:', shapes);
                } catch (e) {
                  console.warn('⚠️ No se pudo obtener formas:', e);
                }

                // Rango de precios visible
                try {
                  const visibleRange = chart.getVisibleRange();
                  console.log('👀 Rango visible:', visibleRange);
                } catch (e) {
                  console.warn('⚠️ No se pudo obtener rango visible:', e);
                }

                // Suscribirse a eventos de precio
                chart.onDataLoaded().subscribe(null, () => {
                  console.log('🔄 Nuevos datos cargados');
                  try {
                    const bars = chart.series().bars();
                    if (bars && bars.length) {
                      console.log('📊 Última barra:', bars[bars.length - 1]);
                    }
                  } catch (e) {
                    console.warn('⚠️ Error al acceder a las barras:', e);
                  }
                });

                // Suscribirse a cambios de cursor
                chart.subscribeCrosshairMove((param: any) => {
                  if (param && param.price) {
                    console.log('🎯 Precio en cursor:', param.price);
                  }
                });

              } catch (error) {
                console.error('❌ Error al recopilar datos:', error);
              }
            };

            // Recopilar datos inmediatamente y cada 5 segundos
            collectChartData();
            const dataInterval = setInterval(collectChartData, 5000);

            return () => {
              clearInterval(dataInterval);
            };
          },
        });

        console.log('✅ Widget de TradingView creado exitosamente');
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
      console.error('❌ Error al cargar script de TradingView');
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
  }, []);

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