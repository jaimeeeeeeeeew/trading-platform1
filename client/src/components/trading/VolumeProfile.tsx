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
      console.log('📊 Volume Profile debug - Missing data:', {
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
      console.log('📊 Rendering volume profile with:', {
        dataPoints: data.length,
        dimensions: { width, height },
        priceRange: visiblePriceRange,
        sampleData: data.slice(0, 3)
      });

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      // Establecer dimensiones del SVG
      svg
        .attr('width', width)
        .attr('height', height)
        .style('overflow', 'visible');

      const maxVolume = Math.max(...data.map(d => d.volume));

      // Escala para el ancho de las barras
      const xScale = d3.scaleLinear()
        .domain([0, maxVolume])
        .range([0, width * 0.8]); // Usar 80% del ancho

      // Escala para la posición vertical
      const yScale = d3.scaleLinear()
        .domain([visiblePriceRange.min, visiblePriceRange.max])
        .range([height - 20, 20]); // Dejar margen arriba y abajo

      // Contenedor para las barras
      const barsGroup = svg.append('g')
        .attr('transform', 'translate(0,0)');

      // Altura mínima de barra más grande
      const barHeight = Math.max(5, height / (visiblePriceRange.max - visiblePriceRange.min));

      // Renderizar las barras
      barsGroup.selectAll('rect')
        .data(data)
        .join('rect')
        .attr('x', 0)
        .attr('y', d => yScale(d.price))
        .attr('width', d => Math.max(10, xScale(d.volume))) // Ancho mínimo de 10px
        .attr('height', barHeight)
        .attr('fill', d => d.side === 'ask' ? '#ef5350' : '#26a69a')
        .attr('opacity', 0.8)
        .attr('stroke', d => d.side === 'ask' ? '#ef5350' : '#26a69a')
        .attr('stroke-width', 1);

      // Línea de precio actual
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
      console.error('❌ Error rendering volume profile:', error);
    }
  }, [data, width, height, visiblePriceRange, currentPrice, priceCoordinates, visibleLogicalRange]);

  return (
    <svg 
      ref={svgRef}
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(21, 25, 36, 0.95)',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        zIndex: 1000,
      }}
    />
  );
};