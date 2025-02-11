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
  priceCoordinates: {
    currentPrice: number;
    currentY: number;
    minPrice: number;
    minY: number;
    maxPrice: number;
    maxY: number;
  } | null;
}

export const VolumeProfile = ({ 
  data, 
  width, 
  height,
  visiblePriceRange,
  currentPrice
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const margin = { top: 10, right: 30, bottom: 10, left: 0 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Calcular el volumen máximo
      const maxVolume = d3.max(data, d => d.volume) || 0;

      // Escalas
      const xScale = d3.scaleLinear()
        .domain([0, maxVolume])
        .range([0, innerWidth * 0.8]);

      const yScale = d3.scaleLinear()
        .domain([visiblePriceRange.min, visiblePriceRange.max])
        .range([innerHeight, 0]);

      // Altura mínima de las barras para asegurar visibilidad
      const barHeight = Math.max(3, Math.min(6, height / data.length));

      // Dibujar barras de volumen
      g.selectAll('.volume-bar')
        .data(data)
        .join('rect')
        .attr('class', 'volume-bar')
        .attr('x', 0)
        .attr('y', d => yScale(d.price) - barHeight / 2)
        .attr('width', d => Math.max(2, xScale(d.volume))) // Mínimo 2px de ancho
        .attr('height', barHeight)
        .attr('fill', d => d.side === 'bid' ? '#26a69a' : '#ef5350')
        .attr('opacity', 0.8)
        .attr('rx', 1);

      // Línea de precio actual
      if (currentPrice) {
        // Línea principal
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerWidth)
          .attr('y1', yScale(currentPrice))
          .attr('y2', yScale(currentPrice))
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,2');

        // Etiqueta de precio
        g.append('text')
          .attr('x', innerWidth)
          .attr('y', yScale(currentPrice))
          .attr('dy', '-4')
          .attr('text-anchor', 'end')
          .attr('fill', '#ffffff')
          .attr('font-size', '10px')
          .text(currentPrice.toFixed(1));
      }

      // Eje de precios
      const priceAxis = d3.axisRight(yScale)
        .ticks(5)
        .tickSize(3);

      const priceAxisGroup = g.append('g')
        .attr('transform', `translate(${innerWidth},0)`)
        .call(priceAxis);

      priceAxisGroup.select('.domain').remove();
      priceAxisGroup.selectAll('.tick line')
        .attr('stroke', '#666')
        .attr('stroke-width', 0.5);
      priceAxisGroup.selectAll('.tick text')
        .attr('fill', '#fff')
        .attr('font-size', '9px');

      // Información del perfil
      g.append('text')
        .attr('x', 5)
        .attr('y', 15)
        .attr('fill', '#fff')
        .attr('font-size', '10px')
        .text(`Vol Profile (${data.length})`);

    } catch (error) {
      console.error('Error rendering volume profile:', error);
    }
  }, [data, width, height, visiblePriceRange, currentPrice]);

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: `${width}px`,
        height: '100%',
        background: 'rgba(21, 25, 36, 0.95)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
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