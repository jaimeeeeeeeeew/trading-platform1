import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Props {
  data: {
    price: number;
    volume: number;
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
  priceCoordinates: {
    currentPrice: number;
    currentY: number;
    minPrice: number;
    minY: number;
    maxPrice: number;
    maxY: number;
  } | null;
  visibleLogicalRange: { from: number; to: number; } | null;
}

export const VolumeProfile = ({ 
  data, 
  width, 
  height,
  visiblePriceRange,
  currentPrice,
  priceCoordinates,
  visibleLogicalRange
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0 || !priceCoordinates || !visibleLogicalRange) {
      console.log('📊 Volume Profile debug:', {
        hasRef: !!svgRef.current,
        dataLength: data?.length,
        hasCoords: !!priceCoordinates,
        hasRange: !!visibleLogicalRange,
        width,
        height
      });
      return;
    }

    try {
      console.log('📊 Starting to render volume profile with data:', {
        dataPoints: data.length,
        firstPoint: data[0],
        lastPoint: data[data.length - 1],
        dimensions: { width, height },
        priceRange: visiblePriceRange
      });

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      // Configurar el SVG con las dimensiones correctas
      svg
        .attr('width', width)
        .attr('height', height)
        .style('overflow', 'visible')
        .style('position', 'absolute')
        .style('right', '0')
        .style('top', '0');

      const maxVolume = Math.max(...data.map(d => d.volume));
      console.log('📊 Max volume:', maxVolume);

      const xScale = d3.scaleLinear()
        .domain([0, maxVolume])
        .range([0, width]);

      const yScale = d3.scaleLinear()
        .domain([visiblePriceRange.min, visiblePriceRange.max])
        .range([height, 0]);

      // Grupo para las barras con posición absoluta
      const barsGroup = svg.append('g')
        .style('transform', 'translateX(0)');

      const barHeight = Math.max(1, height / (visiblePriceRange.max - visiblePriceRange.min));
      console.log('📊 Bar height:', barHeight);

      const bars = barsGroup.selectAll('rect')
        .data(data)
        .join('rect')
        .attr('x', 0)
        .attr('y', d => yScale(d.price))
        .attr('width', d => xScale(d.volume))
        .attr('height', barHeight)
        .attr('fill', d => {
          const alpha = Math.min(0.8, 0.3 + (d.volume / maxVolume) * 0.7);
          return d.side === 'ask' 
            ? `rgba(239, 83, 80, ${alpha})` // Rojo para asks
            : `rgba(38, 166, 154, ${alpha})`; // Verde para bids
        });

      console.log('📊 Bars rendered:', bars.size());

      // Línea del precio actual
      if (currentPrice) {
        svg.append('line')
          .attr('x1', 0)
          .attr('y1', yScale(currentPrice))
          .attr('x2', width)
          .attr('y2', yScale(currentPrice))
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,2');
      }

    } catch (error) {
      console.error('❌ Error rendering volume profile:', error);
    }
  }, [data, width, height, visiblePriceRange, currentPrice, priceCoordinates, visibleLogicalRange]);

  return (
    <svg 
      ref={svgRef}
      className="volume-profile-svg"
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: '100%',
        height: '100%',
        overflow: 'visible',
        backgroundColor: 'rgba(21, 25, 36, 0.7)',
      }}
    />
  );
};