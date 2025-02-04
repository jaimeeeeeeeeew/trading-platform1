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
  const { currentSymbol, updatePriceRange } = useTrading();
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
          enabled_features: ["volume_force_overlay"]
        });

        console.log('✅ Widget creado exitosamente');

        // Usar _ready_handlers para manejar la inicialización
        widget.current._ready_handlers.push(() => {
          console.log('📊 Widget está listo via _ready_handlers');

          try {
            // Obtener el chart y sus métodos
            console.log('📊 Intentando obtener chart()');
            console.log('📊 Widget actual:', widget.current);
            console.log('📊 Widget methods:', Object.keys(widget.current));

            if (widget.current.chart) {
              console.log('📊 chart existe como propiedad');
              const chartFunction = widget.current.chart;
              console.log('📊 tipo de chart:', typeof chartFunction);

              const chart = chartFunction();
              console.log('📊 Chart obtenido:', chart);
              console.log('📊 Métodos del chart:', Object.keys(chart));

              // Suscribirse a cambios en el chart
              if (chart.subscribe) {
                console.log('📊 Intentando suscribirse a eventos del chart');
                chart.subscribe('onDataLoaded', () => {
                  console.log('📊 Nuevos datos cargados');
                });
              }

              // Intentar obtener el precio actual
              if (chart.crossHairMoved) {
                console.log('📊 Configurando crossHairMoved');
                chart.crossHairMoved().subscribe(
                  null,
                  (param: any) => {
                    console.log('📊 Precio actual:', param.price);
                    if (param.price && updatePriceRange) {
                      updatePriceRange({
                        high: param.price * 1.001,
                        low: param.price * 0.999
                      });
                    }
                  }
                );
              }
            } else {
              console.log('❌ chart no está disponible en el widget');
            }

          } catch (error) {
            console.error('❌ Error al configurar chart:', error);
            console.error('Error details:', {
              name: error.name,
              message: error.message,
              stack: error.stack
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
  }, [currentSymbol, updatePriceRange]);

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