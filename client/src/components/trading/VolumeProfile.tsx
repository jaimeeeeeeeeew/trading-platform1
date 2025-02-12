import { useEffect, useRef } from 'react';
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
}

interface PriceCoordinates {
  currentPrice: number;
  currentY: number;
  minPrice: number;
  minY: number;
  maxPrice: number;
  maxY: number;
}

// Constantes para la agrupación de volumen basadas en el zoom
const ZOOM_LEVELS = {
  TIGHT: 50,     // Rango de $50 o menos - sin agrupación (1:1)
  MEDIUM: 200,   // Rango de $200 o menos - agrupación media (5:1)
  WIDE: 500      // Rango mayor a $500 - agrupación máxima (10:1)
} as const;

const GROUP_RATIOS = {
  NONE: 1,     // Sin agrupación (1:1)
  MEDIUM: 5,   // Agrupación media (5:1)
  LARGE: 10    // Agrupación máxima (10:1)
} as const;

const getGroupRatio = (priceRange: number): number => {
  console.log('Analyzing price range for grouping:', priceRange);

  if (priceRange <= ZOOM_LEVELS.TIGHT) {
    console.log('Using 1:1 ratio - No grouping');
    return GROUP_RATIOS.NONE;
  } else if (priceRange <= ZOOM_LEVELS.MEDIUM) {
    console.log('Using 5:1 ratio - Medium grouping');
    return GROUP_RATIOS.MEDIUM;
  }
  console.log('Using 10:1 ratio - Large grouping');
  return GROUP_RATIOS.LARGE;
};

const getGroupFactor = (ratio: number): string => {
  if (ratio === GROUP_RATIOS.NONE) return '';
  return `${ratio}x`;
};

const groupData = (data: Props['data'], ratio: number) => {
  // Si no hay agrupación, normalizar los volúmenes directamente
  if (ratio === GROUP_RATIOS.NONE) {
    console.log('No grouping applied - Using raw data');
    const maxVolume = Math.max(...data.map(d => d.volume));
    return data.map(item => ({
      ...item,
      normalizedVolume: item.volume / maxVolume
    }));
  }

  console.log(`Applying ${ratio}:1 grouping ratio`);
  const groups = new Map<number, { volume: number; side: 'bid' | 'ask' }>();

  // Ordenar los datos por precio para asegurar grupos contiguos
  const sortedData = [...data].sort((a, b) => a.price - b.price);

  // Agrupar datos en lotes según el ratio
  for (let i = 0; i < sortedData.length; i += ratio) {
    const batch = sortedData.slice(i, i + ratio);
    if (batch.length === 0) continue;

    // Usar el precio promedio del grupo como key
    const avgPrice = Math.round(batch.reduce((sum, item) => sum + item.price, 0) / batch.length);
    const totalVolume = batch.reduce((sum, item) => sum + item.volume, 0);
    // Usar el side más frecuente en el grupo
    const dominantSide = batch.reduce((acc, item) => {
      acc[item.side] = (acc[item.side] || 0) + 1;
      return acc;
    }, {} as Record<'bid' | 'ask', number>);

    groups.set(avgPrice, {
      volume: totalVolume,
      side: dominantSide.bid > dominantSide.ask ? 'bid' : 'ask'
    });
  }

  const maxVolume = Math.max(...Array.from(groups.values()).map(g => g.volume));

  return Array.from(groups.entries()).map(([price, { volume, side }]) => ({
    price,
    volume,
    normalizedVolume: volume / maxVolume,
    side
  }));
};

export const VolumeProfile = ({
  data,
  width = 80,
  height,
  visiblePriceRange,
  currentPrice,
  priceCoordinate,
  priceCoordinates
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0 || !priceCoordinates) {
      console.log('VolumeProfile: Missing data or coordinates:', { 
        data: data?.length, 
        priceCoordinates: !!priceCoordinates 
      });
      return;
    }

    // Calcular el rango de precios visible actual
    const visibleRange = visiblePriceRange.max - visiblePriceRange.min;
    console.log('Price range analysis:', {
      visibleRange,
      min: visiblePriceRange.min,
      max: visiblePriceRange.max
    });

    const groupRatio = getGroupRatio(visibleRange);
    console.log('Selected grouping:', {
      ratio: groupRatio,
      label: getGroupFactor(groupRatio)
    });

    const groupedData = groupData(data, groupRatio);

    console.log('VolumeProfile Data:', {
      totalItems: groupedData.length,
      bids: groupedData.filter(d => d.side === 'bid').length,
      asks: groupedData.filter(d => d.side === 'ask').length,
      priceRange: visibleRange,
      groupSize: groupRatio,
      originalDataLength: data.length,
      sampleOriginalData: data[0],
      sampleGroupedData: groupedData[0]
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 25, right: 50, bottom: 25, left: 55 }; // Increased left margin for price labels
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxBarWidth = innerWidth * 1.6;

    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([maxBarWidth/2, 0]);

    const priceToY = (price: number) => {
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

    const barHeight = Math.max(1, (priceCoordinates.minY - priceCoordinates.maxY) / (groupedData.length * 2));

    const asks = groupedData
      .filter(d => d.side === 'ask')
      .sort((a, b) => a.price - b.price);

    const bids = groupedData
      .filter(d => d.side === 'bid')
      .sort((a, b) => b.price - a.price);

    // Price labels on the left side
    const allPrices = [...bids, ...asks].sort((a, b) => a.price - b.price);
    allPrices.forEach((d, i) => {
      if (i % 2 === 0) { // Show full label for every other price
        g.append('text')
          .attr('class', 'price-label')
          .attr('x', -8)
          .attr('y', priceToY(d.price))
          .attr('dy', '0.32em')
          .attr('text-anchor', 'end')
          .attr('fill', '#ffffff')
          .attr('font-size', '10px')
          .text(`${d.price}${groupRatio > GROUP_RATIOS.NONE ? ` (${getGroupFactor(groupRatio)})` : ''}`);
      } else {
        g.append('text')
          .attr('class', 'price-label')
          .attr('x', -8)
          .attr('y', priceToY(d.price))
          .attr('dy', '0.32em')
          .attr('text-anchor', 'end')
          .attr('fill', '#666')
          .attr('font-size', '10px')
          .text(`${d.price}`);
      }
    });

    g.selectAll('.bid-bars')
      .data(bids)
      .join('rect')
      .attr('class', 'volume-bar bid')
      .attr('x', d => xScale(d.normalizedVolume))
      .attr('y', d => {
        const y = priceToY(d.price);
        return isNaN(y) ? 0 : y - barHeight / 2;
      })
      .attr('width', d => maxBarWidth/2 - xScale(d.normalizedVolume))
      .attr('height', barHeight)
      .attr('fill', '#26a69a')
      .attr('opacity', 0.8);

    g.selectAll('.ask-bars')
      .data(asks)
      .join('rect')
      .attr('class', 'volume-bar ask')
      .attr('x', d => xScale(d.normalizedVolume))
      .attr('y', d => {
        const y = priceToY(d.price);
        return isNaN(y) ? 0 : y - barHeight / 2;
      })
      .attr('width', d => maxBarWidth/2 - xScale(d.normalizedVolume))
      .attr('height', barHeight)
      .attr('fill', '#ef5350')
      .attr('opacity', 0.8);

    if (priceCoordinates.currentPrice && priceCoordinates.currentY) {
      g.append('line')
        .attr('class', 'price-line')
        .attr('x1', -5)
        .attr('x2', innerWidth)
        .attr('y1', priceCoordinates.currentY - margin.top)
        .attr('y2', priceCoordinates.currentY - margin.top)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');

      g.append('text')
        .attr('class', 'price-label')
        .attr('x', innerWidth + 8)
        .attr('y', priceCoordinates.currentY - margin.top)
        .attr('dy', '0.32em')
        .attr('text-anchor', 'start')
        .attr('fill', '#ffffff')
        .attr('font-size', '10px')
        .text(priceCoordinates.currentPrice.toFixed(1));
    }

  }, [data, width, height, currentPrice, priceCoordinates, visiblePriceRange]);

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