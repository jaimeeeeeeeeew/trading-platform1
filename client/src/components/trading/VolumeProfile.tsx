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
}

interface PriceCoordinates {
  currentPrice: number;
  currentY: number;
  minPrice: number;
  minY: number;
  maxPrice: number;
  maxY: number;
}

// Función mejorada para determinar cambios significativos
const hasSignificantChanges = (prevBars: Props['data'], newBars: Props['data'], threshold = 0.05) => {
  if (!prevBars || !newBars || prevBars.length !== newBars.length) return true;

  // Solo comparar una muestra de barras para mejor rendimiento
  const sampleSize = Math.min(50, prevBars.length);
  const step = Math.max(1, Math.floor(prevBars.length / sampleSize));

  for (let i = 0; i < prevBars.length; i += step) {
    const prevBar = prevBars[i];
    const newBar = newBars[i];
    if (!prevBar || !newBar) continue;

    if (Math.abs(newBar.volume - prevBar.volume) / prevBar.volume > threshold ||
        Math.abs(newBar.price - prevBar.price) > threshold) {
      return true;
    }
  }
  return false;
};

// Función optimizada para combinar barras superpuestas
const mergeOverlappingBars = (bars: Props['data'], getY: (price: number) => number, tolerance: number = 3) => {
  if (!bars || bars.length === 0) return { bars: [], maxVolumeBar: null };

  const merged = new Map<number, Props['data'][0]>();
  let maxVolumeBar = bars[0];

  bars.forEach(bar => {
    const y = Math.round(getY(bar.price));
    const key = Math.floor(y / tolerance) * tolerance;

    if (merged.has(key)) {
      const existing = merged.get(key)!;
      const totalVolume = existing.volume + bar.volume;
      existing.price = (existing.price * existing.volume + bar.price * bar.volume) / totalVolume;
      existing.volume = totalVolume;

      if (totalVolume > maxVolumeBar.volume) {
        maxVolumeBar = existing;
      }
    } else {
      merged.set(key, { ...bar });
      if (bar.volume > maxVolumeBar.volume) {
        maxVolumeBar = bar;
      }
    }
  });

  const mergedArray = Array.from(merged.values());
  const maxVolume = maxVolumeBar.volume;

  return {
    bars: mergedArray.map(bar => ({
      ...bar,
      normalizedVolume: bar.volume / maxVolume
    })),
    maxVolumeBar
  };
};

// Función para determinar qué barras son visibles
const getVisibleBars = (
  bars: Props['data'],
  height: number,
  priceToY: (price: number) => number,
  viewport: { top: number; bottom: number }
) => {
  return bars.filter(bar => {
    const y = priceToY(bar.price);
    return y >= viewport.top - 50 && y <= viewport.bottom + 50; // Buffer de 50px
  });
};

export const VolumeProfile = ({
  data,
  width = 150,
  height,
  visiblePriceRange,
  currentPrice,
  priceCoordinate,
  priceCoordinates,
  maxVisibleBars
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const prevDataRef = useRef<Props['data']>([]);
  const updateTimeoutRef = useRef<number | null>(null);
  const renderRequestRef = useRef<number | null>(null);

  const processedData = useMemo(() => {
    const visibleData = data.filter(
      d => d.price >= visiblePriceRange.min && d.price <= visiblePriceRange.max
    );

    const asks = visibleData.filter(d => d.side === 'ask').sort((a, b) => a.price - b.price);
    const bids = visibleData.filter(d => d.side === 'bid').sort((a, b) => b.price - a.price);

    return { asks, bids };
  }, [data, visiblePriceRange]);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0 || !priceCoordinates) {
      return;
    }

    const renderChart = () => {
      const { asks, bids } = processedData;

      if (!hasSignificantChanges(prevDataRef.current, [...asks, ...bids])) {
        return;
      }
      prevDataRef.current = [...asks, ...bids];

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

      const viewport = {
        top: 0,
        bottom: height
      };

      const visibleRange = priceCoordinates.minY - priceCoordinates.maxY;
      const barHeight = Math.max(3, visibleRange / maxVisibleBars * 0.8);

      const { bars: mergedAsks, maxVolumeBar: maxAskBar } = mergeOverlappingBars(
        getVisibleBars(asks, height, priceToY, viewport),
        priceToY,
        barHeight
      );

      const { bars: mergedBids, maxVolumeBar: maxBidBar } = mergeOverlappingBars(
        getVisibleBars(bids, height, priceToY, viewport),
        priceToY,
        barHeight
      );

      const maxVolumeBar = maxAskBar && maxBidBar
        ? (maxAskBar.volume > maxBidBar.volume ? maxAskBar : maxBidBar)
        : (maxAskBar || maxBidBar);

      g.selectAll('.bid-bars')
        .data(mergedBids)
        .join('rect')
        .attr('class', 'volume-bar bid')
        .attr('x', d => xScale(d.normalizedVolume))
        .attr('y', d => {
          const y = priceToY(d.price);
          return isNaN(y) ? 0 : y - barHeight / 2;
        })
        .attr('width', d => maxBarWidth - xScale(d.normalizedVolume))
        .attr('height', barHeight * 0.9)
        .attr('fill', '#26a69a')
        .attr('opacity', 0.9);

      g.selectAll('.ask-bars')
        .data(mergedAsks)
        .join('rect')
        .attr('class', 'volume-bar ask')
        .attr('x', d => xScale(d.normalizedVolume))
        .attr('y', d => {
          const y = priceToY(d.price);
          return isNaN(y) ? 0 : y - barHeight / 2;
        })
        .attr('width', d => maxBarWidth - xScale(d.normalizedVolume))
        .attr('height', barHeight * 0.9)
        .attr('fill', '#ef5350')
        .attr('opacity', 0.9);

      if (maxVolumeBar) {
        const maxVolumeY = priceToY(maxVolumeBar.price);
        if (maxVolumeY !== null) {
          g.append('text')
            .attr('class', 'max-volume-label')
            .attr('x', -5)
            .attr('y', maxVolumeY)
            .attr('dy', '0.32em')
            .attr('text-anchor', 'end')
            .attr('fill', '#ffffff')
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .text(`${maxVolumeBar.volume.toFixed(3)} BTC`);
        }
      }

      if (priceCoordinates.currentPrice && priceCoordinates.currentY) {
        g.append('line')
          .attr('class', 'price-line')
          .attr('x1', -5)
          .attr('x2', innerWidth)
          .attr('y1', priceCoordinates.currentY - margin.top)
          .attr('y2', priceCoordinates.currentY - margin.top)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '2,2');

        g.append('text')
          .attr('class', 'current-price-label')
          .attr('x', innerWidth + 5)
          .attr('y', priceCoordinates.currentY - margin.top)
          .attr('dy', '0.32em')
          .attr('text-anchor', 'start')
          .attr('fill', '#ffffff')
          .attr('font-size', '11px')
          .attr('font-weight', 'bold')
          .text(priceCoordinates.currentPrice.toFixed(1));
      }
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

    updateTimeoutRef.current = window.setTimeout(scheduleRender, 50);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (renderRequestRef.current) {
        cancelAnimationFrame(renderRequestRef.current);
      }
    };
  }, [processedData, width, height, currentPrice, priceCoordinates, visiblePriceRange, maxVisibleBars]);

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