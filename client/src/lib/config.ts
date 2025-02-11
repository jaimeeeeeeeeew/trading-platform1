// TradingView configuration
export const tradingViewConfig = {
  supported_resolutions: ['1', '5', '15', '60', '240', 'D'],
  supports_marks: true,
  supports_time: true,
  supports_timescale_marks: true,
  exchanges: [{
    value: 'BINANCE',
    name: 'Binance',
    desc: 'Binance'
  }],
  symbols_types: [{
    name: 'crypto',
    value: 'crypto'
  }]
};

// Chart configuration
export const chartConfig = {
  volumeProfileWidth: 160 // Reducido de 180 a 160
};