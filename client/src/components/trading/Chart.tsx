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
          custom_css_url: './chart.css'
        });

        console.log('✅ Widget creado exitosamente');

        // Listen for messages from the TradingView iframe
        const handleMessage = (event: MessageEvent) => {
          if (event.source !== widget.current.iframe.contentWindow) {
            return;
          }

          try {
            const data = JSON.parse(event.data);
            console.log('📊 Mensaje recibido del widget:', data);

            if (data.name === 'price') {
              console.log('📊 Precio recibido:', data.price);
              updatePriceRange({
                high: data.price * 1.001,
                low: data.price * 0.999
              });
            }

            // Procesar información del rango temporal
            if (data.name === 'timeRange') {
              console.log('📊 Rango temporal recibido:', data.range);
              updateTimeRange({
                from: new Date(data.range.from * 1000),
                to: new Date(data.range.to * 1000),
                interval: data.range.interval
              });
            }
          } catch (error) {
            // Ignore non-JSON messages
          }
        };

        window.addEventListener('message', handleMessage);

        // Solicitar información del rango temporal
        widget.current._ready_handlers.push(() => {
          console.log('📊 Widget está listo, solicitando información temporal');
          if (widget.current.iframe && widget.current.iframe.contentWindow) {
            widget.current.iframe.contentWindow.postMessage({
              name: 'getTimeRange'
            }, '*');
          }
        });

        return () => {
          window.removeEventListener('message', handleMessage);
        };

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