import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    TradingView: any;
  }
}

export default function Chart() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      new window.TradingView.widget({
        container_id: container.current!.id,
        autosize: true,
        width: "100%",
        height: "100%",
        symbol: "BINANCE:BTCUSDT",
        interval: "60",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "es",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        show_popup_button: true,
        popup_width: "1000",
        popup_height: "650",
        studies: [
          {
            id: "VolumeProfile@tv-prostudies",
            inputs: {
              first_bar_time: Math.floor(Date.now() / 1000) - 24 * 60 * 60,
              last_bar_time: Math.floor(Date.now() / 1000),
              rows: 24,
              volume_accuracy: 2,
              line_width: 2
            }
          }
        ],
        studies_overrides: {
          "volume.volume.color.0": "#089981",
          "volume.volume.color.1": "#F23645",
          "volume.volume.transparency": 70,
          "volume.volume.value_area.transparency": 50
        },
        overrides: {
          "mainSeriesProperties.candleStyle.upColor": "#089981",
          "mainSeriesProperties.candleStyle.downColor": "#F23645",
          "mainSeriesProperties.candleStyle.borderUpColor": "#089981",
          "mainSeriesProperties.candleStyle.borderDownColor": "#F23645",
          "mainSeriesProperties.candleStyle.wickUpColor": "#089981",
          "mainSeriesProperties.candleStyle.wickDownColor": "#F23645",
          "volumePaneSize": "medium"
        }
      });
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border bg-card">
      <div
        id="tradingview_widget"
        ref={container}
        style={{ height: "calc(100vh - 2rem)" }}
        className="w-full"
      />
    </div>
  );
}