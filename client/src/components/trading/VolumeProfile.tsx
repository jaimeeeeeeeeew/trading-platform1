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
      console.log('📊 Volume Profile debug - No rendering:', {
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
      console.log('📊 Data received:', {
        points: data.length,
        samplePoint: data[0],
        maxVolume: Math.max(...data.map(d => d.volume)),
        minVolume: Math.min(...data.map(d => d.volume))
      });

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      svg
        .attr('width', width)
        .attr('height', height)
        .style('overflow', 'visible')
        .style('position', 'absolute')
        .style('right', '0')
        .style('top', '0')
        .style('z-index', '1000');

      const maxVolume = Math.max(...data.map(d => d.volume));

      // Usar el 90% del ancho disponible para las barras
      const xScale = d3.scaleLinear()
        .domain([0, maxVolume])
        .range([0, width * 0.9]);

      const yScale = d3.scaleLinear()
        .domain([visiblePriceRange.min, visiblePriceRange.max])
        .range([height, 0]);

      // Grupo para las barras
      const barsGroup = svg.append('g')
        .style('transform', 'translateX(0)');

      // Altura mínima de 3 píxeles para cada barra
      const barHeight = Math.max(3, height / (visiblePriceRange.max - visiblePriceRange.min));

      const bars = barsGroup.selectAll('rect')
        .data(data)
        .join('rect')
        .attr('x', 0)
        .attr('y', d => yScale(d.price))
        .attr('width', d => Math.max(5, xScale(d.volume))) // Ancho mínimo de 5 píxeles
        .attr('height', barHeight)
        .attr('fill', d => {
          const alpha = Math.min(1, 0.7 + (d.volume / maxVolume) * 0.3); // Mayor opacidad base
          return d.side === 'ask' 
            ? `rgba(239, 83, 80, ${alpha})` // Rojo para asks
            : `rgba(38, 166, 154, ${alpha})`; // Verde para bids
        })
        .attr('stroke', d => d.side === 'ask' ? '#ef5350' : '#26a69a')
        .attr('stroke-width', 1);

      // Línea del precio actual
      if (currentPrice) {
        svg.append('line')
          .attr('x1', 0)
          .attr('y1', yScale(currentPrice))
          .attr('x2', width)
          .attr('y2', yScale(currentPrice))
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4,4');
      }

    } catch (error) {
      console.error('❌ Error renderizando el perfil de volumen:', error);
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
        backgroundColor: 'rgba(21, 25, 36, 0.9)',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        zIndex: 1000,
      }}
    />
  );
};