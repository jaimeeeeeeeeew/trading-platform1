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
