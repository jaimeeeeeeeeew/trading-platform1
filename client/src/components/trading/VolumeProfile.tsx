import { useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';

interface Props {
  data: {
    price: number;
    volume: number;
    normalizedVolume: number;
    side: 'bid' | 'ask';
  }[];
  width: number;
  height: number;
  visiblePriceRange: {
    min: number;
    max: number;
  };
  currentPrice: number;
  priceCoordinate: number | null;
  priceCoordinates: PriceCoordinates | null;
  maxVisibleBars: number;
  grouping: '1' | '5' | '10';
}

interface PriceCoordinates {
  currentPrice: number;
  currentY: number;
  minPrice: number;
  minY: number;
  maxPrice: number;
  maxY: number;
}

// Optimizada con WeakMap para caché de resultados
const volumeDataCache = new WeakMap();

// Memoizado y optimizado para mejor rendimiento
const hasSignificantChanges = (prevBars: Props['data'], newBars: Props['data'], threshold = 0.15) => {
  if (!prevBars || !newBars || Math.abs(prevBars.length - newBars.length) > 50) return true;

  const sampleSize = 10; // Reducido para mejor rendimiento
  const step = Math.max(1, Math.floor(prevBars.length / sampleSize));

  let significantChanges = 0;
  const maxSignificantChanges = 2;

  for (let i = 0; i < prevBars.length && significantChanges < maxSignificantChanges; i += step) {
    const prevBar = prevBars[i];
    const newBar = newBars[i];
    if (!prevBar || !newBar) continue;

    if (Math.abs(newBar.volume - prevBar.volume) / prevBar.volume > threshold ||
        Math.abs(newBar.price - prevBar.price) > threshold * prevBar.price) {
      significantChanges++;
    }
  }

  return significantChanges >= maxSignificantChanges;
};

// Optimizado con memorización de resultados
const groupVolumeData = (data: Props['data'], groupSize: number) => {
  const cacheKey = JSON.stringify({ groupSize, length: data.length });
  if (volumeDataCache.has(data) && volumeDataCache.get(data).key === cacheKey) {
    return volumeDataCache.get(data).value;
  }

  if (groupSize === 1) return data;

  const groups = new Map<number, {
    volume: number;
    side: 'bid' | 'ask';
    price: number;
    count: number;
  }>();

  // Procesamiento por lotes para mejor rendimiento
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    batch.forEach(item => {
      const roundedPrice = Math.round(item.price / (10 * groupSize)) * (10 * groupSize);
      const existing = groups.get(roundedPrice);

      if (existing) {
        existing.volume += item.volume;
        existing.count++;
        if (item.volume > existing.volume / existing.count) {
          existing.side = item.side;
        }
      } else {
        groups.set(roundedPrice, {
          volume: item.volume,
          side: item.side,
          price: roundedPrice,
          count: 1
        });
      }
    });
  }

  const maxVolume = Math.max(...Array.from(groups.values()).map(item => item.volume));
  const result = Array.from(groups.values()).map(item => ({
    price: item.price,
    volume: item.volume,
    normalizedVolume: item.volume / maxVolume,
    side: item.side
  }));

  volumeDataCache.set(data, { key: cacheKey, value: result });
  return result;
};

export const VolumeProfile = ({
  data,
  width = 150,
  height,
  visiblePriceRange,
  currentPrice,
  priceCoordinate,
  priceCoordinates,
  maxVisibleBars,
  grouping
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const prevDataRef = useRef<Props['data']>([]);
  const renderTimeoutRef = useRef<number | null>(null);
  const lastRenderTimeRef = useRef<number>(0);
  const prevGroupedDataRef = useRef<Props['data']>([]);

  // Memoizar los datos agrupados con useCallback para mejor rendimiento
  const processVolumeData = useCallback(() => {
    const groupSize = parseInt(grouping);
    if (!data || data.length === 0) return [];

    const filteredData = data.filter(d => 
      d.price >= visiblePriceRange.min && 
      d.price <= visiblePriceRange.max
    );

    return groupVolumeData(filteredData, groupSize);
  }, [data, grouping, visiblePriceRange]);

  // Memoizar los datos procesados
  const groupedData = useMemo(() => processVolumeData(), [processVolumeData]);

  useEffect(() => {
    if (!svgRef.current || !groupedData || groupedData.length === 0 || !priceCoordinates) {
      return;
    }

    const renderChart = () => {
      const now = Date.now();
      if (now - lastRenderTimeRef.current < 150) { // Throttle aumentado a 150ms
        return;
      }

      if (!hasSignificantChanges(prevGroupedDataRef.current, groupedData)) {
        return;
      }

      lastRenderTimeRef.current = now;
      prevGroupedDataRef.current = groupedData;

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const margin = { top: 20, right: -65, bottom: 20, left: 0 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const maxBarWidth = innerWidth * 0.7;
      const xScale = d3.scaleLinear()
        .domain([0, 1])
        .range([maxBarWidth, 0]);

      const priceToY = (price: number) => {
        if (!priceCoordinates) return 0;

        if (price === currentPrice) {
          return priceCoordinates.currentY - margin.top;
        }

        if (price > currentPrice) {
          const askRatio = (price - currentPrice) / (priceCoordinates.maxPrice - currentPrice);
          return priceCoordinates.currentY - margin.top - (askRatio * (priceCoordinates.currentY - priceCoordinates.maxY));
        }

        const bidRatio = (currentPrice - price) / (currentPrice - priceCoordinates.minPrice);
        return priceCoordinates.currentY - margin.top + (bidRatio * (priceCoordinates.minY - priceCoordinates.currentY));
      };

      const barHeight = Math.abs(
        priceToY(currentPrice + (10 * parseInt(grouping))) - priceToY(currentPrice)
      );

      const bids = groupedData.filter((d: {side: 'bid' | 'ask'}) => d.side === 'bid');
      const asks = groupedData.filter((d: {side: 'bid' | 'ask'}) => d.side === 'ask');

      // Renderizar barras por lotes para mejor rendimiento
      const renderBars = (data: typeof groupedData, className: string, fill: string) => {
        const batchSize = 50;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          g.selectAll(`.${className}-batch-${i}`)
            .data(batch)
            .join('rect')
            .attr('class', (d: { normalizedVolume: number; price: number }) => `volume-bar ${className}`)
            .attr('x', (d: { normalizedVolume: number }) => xScale(d.normalizedVolume))
            .attr('y', (d: { price: number }) => priceToY(d.price) - barHeight / 2)
            .attr('width', (d: { normalizedVolume: number }) => maxBarWidth - xScale(d.normalizedVolume))
            .attr('height', barHeight * 0.9)
            .attr('fill', fill)
            .attr('opacity', 0.9);
        }
      };

      renderBars(bids, 'bid', '#26a69a');
      renderBars(asks, 'ask', '#ef5350');
    };

    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = window.setTimeout(renderChart, 150);

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [groupedData, width, height, currentPrice, priceCoordinates, visiblePriceRange, maxVisibleBars, grouping, processVolumeData]);

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: `${width}px`,
        height: '100%',
        background: 'transparent',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 2
      }}
    >
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
};