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
        save_image: false,
        hide_top_toolbar: false,
        withdateranges: true,
        details: true,
        hotlist: true,
        calendar: true,
        show_popup_button: true,
        popup_width: "1000",
        popup_height: "650",
        loading_screen: { backgroundColor: "#131722" },
        overrides: { "mainSeriesProperties.style": 1 },
        disabled_features: ["use_localstorage_for_settings"],
        enabled_features: ["study_templates"],
        charts_storage_url: 'https://saveload.tradingview.com',
        charts_storage_api_version: "1.1",
        client_id: 'tradingview.com',
        user_id: 'public_user_id',
        autosize: true,
        symbol_search_request_delay: 500,
        time_frames: [
          { text: "5y", resolution: "W" },
          { text: "1y", resolution: "W" },
          { text: "6m", resolution: "D" },
          { text: "3m", resolution: "D" },
          { text: "1m", resolution: "D" },
          { text: "5d", resolution: "60" },
          { text: "1d", resolution: "30" }
        ]
      });

      // Crear una variable global para acceder al widget
      (window as any).tvWidget = widget;

      // Esperar a que el widget esté listo
      widget.onChartReady && widget.onChartReady(() => {
        console.log('TradingView chart is ready');

        // Suscribirse a los cambios de símbolo
        const chart = (window as any).tvWidget.activeChart();
        if (chart && chart.onSymbolChanged) {
          chart.onSymbolChanged().subscribe(null, (symbol: string) => {
            console.log('Symbol changed to:', symbol);

            // Actualizar el símbolo seleccionado
            if (symbol.includes('BTC')) {
              setSelectedSymbol('BTCUSDT');
            } else if (symbol.includes('ETH')) {
              setSelectedSymbol('ETHUSDT');
            } else if (symbol.includes('ADA')) {
              setSelectedSymbol('ADAUSDT');
            }
          });
        }
      });
    };

    document.head.appendChild(script);

    return () => {
      // Limpiar el widget al desmontar
      if ((window as any).tvWidget) {
        (window as any).tvWidget.remove();
        delete (window as any).tvWidget;
      }
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