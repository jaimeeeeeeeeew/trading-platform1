import { useEffect, useRef, useMemo } from 'react';
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

// Optimizada para mejor rendimiento
const hasSignificantChanges = (prevBars: Props['data'], newBars: Props['data'], threshold = 0.1) => {
  if (!prevBars || !newBars || Math.abs(prevBars.length - newBars.length) > 50) return true;

  const sampleSize = 20; // Reducido para mejor rendimiento
  const step = Math.max(1, Math.floor(prevBars.length / sampleSize));

  let significantChanges = 0;
  const maxSignificantChanges = 3;

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

// Memoizado para evitar recálculos innecesarios
const groupVolumeData = (data: Props['data'], groupSize: number) => {
  if (groupSize === 1) return data;

  const groups = new Map<number, {
    volume: number;
    side: 'bid' | 'ask';
    price: number;
    count: number;
  }>();

  data.forEach(item => {
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

  const maxVolume = Math.max(...Array.from(groups.values()).map(item => item.volume));

  return Array.from(groups.values()).map(item => ({
    price: item.price,
    volume: item.volume,
    normalizedVolume: item.volume / maxVolume,
    side: item.side
  }));
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
  const updateTimeoutRef = useRef<number | null>(null);
  const renderRequestRef = useRef<number | null>(null);
  const lastRenderTimeRef = useRef<number>(0);

  // Memoizar los datos agrupados
  const groupedData = useMemo(() => {
    const groupSize = parseInt(grouping);
    return groupVolumeData(data, groupSize);
  }, [data, grouping]);

  useEffect(() => {
    if (!svgRef.current || !groupedData || groupedData.length === 0 || !priceCoordinates) {
      return;
    }

    const renderChart = () => {
      const now = Date.now();
      if (now - lastRenderTimeRef.current < 100) { // Throttle a 100ms
        return;
      }

      if (!hasSignificantChanges(prevDataRef.current, groupedData)) {
        return;
      }

      lastRenderTimeRef.current = now;
      prevDataRef.current = groupedData;

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

      // Filtrar datos dentro del rango visible
      const visibleData = groupedData.filter(d => 
        d.price >= visiblePriceRange.min && 
        d.price <= visiblePriceRange.max
      );

      const bids = visibleData.filter(d => d.side === 'bid');
      const asks = visibleData.filter(d => d.side === 'ask');

      const barHeight = Math.abs(
        priceToY(currentPrice + (10 * parseInt(grouping))) - priceToY(currentPrice)
      );

      // Renderizar barras de bids
      g.selectAll('.bid-bars')
        .data(bids)
        .join('rect')
        .attr('class', 'volume-bar bid')
        .attr('x', d => xScale(d.normalizedVolume))
        .attr('y', d => priceToY(d.price) - barHeight / 2)
        .attr('width', d => maxBarWidth - xScale(d.normalizedVolume))
        .attr('height', barHeight * 0.9)
        .attr('fill', '#26a69a')
        .attr('opacity', 0.9);

      // Renderizar barras de asks
      g.selectAll('.ask-bars')
        .data(asks)
        .join('rect')
        .attr('class', 'volume-bar ask')
        .attr('x', d => xScale(d.normalizedVolume))
        .attr('y', d => priceToY(d.price) - barHeight / 2)
        .attr('width', d => maxBarWidth - xScale(d.normalizedVolume))
        .attr('height', barHeight * 0.9)
        .attr('fill', '#ef5350')
        .attr('opacity', 0.9);
    };

    const scheduleRender = () => {
      if (renderRequestRef.current) {
        cancelAnimationFrame(renderRequestRef.current);
      }
      renderRequestRef.current = requestAnimationFrame(renderChart);
    };

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Throttle las actualizaciones a 100ms
    updateTimeoutRef.current = window.setTimeout(scheduleRender, 100);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (renderRequestRef.current) {
        cancelAnimationFrame(renderRequestRef.current);
      }
    };
  }, [groupedData, width, height, currentPrice, priceCoordinates, visiblePriceRange, maxVisibleBars, grouping]);

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