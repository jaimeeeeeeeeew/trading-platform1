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
    console.log('🔄 Iniciando efecto para cargar TradingView');
    if (!container.current) {
      console.error('❌ Container ref no disponible');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('✅ Script de TradingView cargado');

      try {
        console.log('🎯 Intentando crear widget de TradingView');

        widget.current = new window.TradingView.widget({
          autosize: true,
          symbol: currentSymbol,
          interval: "1",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "es",
          toolbar_bg: "#f1f3f6",
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: container.current!.id,
          width: "100%",
          height: "100%",
          withdateranges: true,
          hide_side_toolbar: false,
          studies: [
            "MAExp@tv-basicstudies",
            "VWAP@tv-basicstudies"
          ],
          loading_screen: { backgroundColor: "#1a1a1a" },
          // Configuraciones importantes para seguridad
          enable_iframe_api: true,
          customer: "replit",
          library_path: '/charting_library/',
          drawings_access: { type: 'replitOnly', tools: [ { name: "Regression Trend" } ] },
          disabled_features: [
            "header_symbol_search",
            "use_localstorage_for_settings"
          ],
          enabled_features: [
            "volume_force_overlay",
            "iframe_loading_compatibility_mode"
          ],
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
      if (widget.current && widget.current.remove) {
        widget.current.remove();
      }
    };
  }, [currentSymbol, toast]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border bg-[#1a1a1a]">
      <div
        id="tradingview_widget"
        ref={container}
        className="w-full h-full"
      />
    </div>
  );
}