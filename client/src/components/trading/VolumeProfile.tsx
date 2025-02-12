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

export const VolumeProfile = ({
  data,
  width = 160,
  height,
  visiblePriceRange,
  currentPrice,
  priceCoordinate,
  priceCoordinates
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0 || !priceCoordinates) {
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 10, right: 0, bottom: 10, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxBarWidth = innerWidth * 0.7;

    // Escala para el ancho de las barras (volumen)
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, maxBarWidth]);

    // Usar el mismo sistema de coordenadas que el gráfico principal
    const yScale = d3.scaleLinear()
      .domain([priceCoordinates.minPrice, priceCoordinates.maxPrice])
      .range([innerHeight, 0]); // Invertimos el rango para que coincida con el gráfico

    // Altura mínima de las barras basada en el rango visible
    const priceRange = priceCoordinates.maxPrice - priceCoordinates.minPrice;
    const minBarHeight = Math.max(1, (innerHeight / (priceRange / 2)));

    // Filtrar datos dentro del rango visible y ordenar por precio
    const visibleData = data
      .filter(d => d.price >= priceCoordinates.minPrice && d.price <= priceCoordinates.maxPrice)
      .sort((a, b) => a.price - b.price);

    // Dibujar barras de volumen
    g.selectAll('.volume-bar')
      .data(visibleData)
      .join('rect')
      .attr('class', 'volume-bar')
      .attr('x', 0)
      .attr('y', d => {
        const y = yScale(d.price);
        return Number.isFinite(y) ? y - minBarHeight / 2 : 0;
      })
      .attr('width', d => Math.max(1, xScale(d.normalizedVolume)))
      .attr('height', minBarHeight)
      .attr('fill', d => d.side === 'bid' ? '#26a69a' : '#ef5350')
      .attr('opacity', 0.8);

    // Línea de precio actual
    if (priceCoordinates.currentPrice && Number.isFinite(yScale(priceCoordinates.currentPrice))) {
      // Línea principal
      g.append('line')
        .attr('class', 'price-line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(priceCoordinates.currentPrice))
        .attr('y2', yScale(priceCoordinates.currentPrice))
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');

      // Etiqueta de precio actual
      g.append('text')
        .attr('class', 'price-label')
        .attr('x', -5)
        .attr('y', yScale(priceCoordinates.currentPrice))
        .attr('dy', '0.32em')
        .attr('text-anchor', 'end')
        .attr('fill', '#ffffff')
        .attr('font-size', '10px')
        .text(priceCoordinates.currentPrice.toFixed(1));
    }

    // Crear escala de precios
    const priceStep = Math.round(priceRange / 8); // Dividir el rango en 8 partes
    const customPrices = Array.from({ length: 9 }, (_, i) => 
      Math.round(priceCoordinates.minPrice + (i * priceStep))
    );

    // Grupo para los ticks de precio
    const priceAxisGroup = g.append('g')
      .attr('class', 'price-axis')
      .attr('transform', `translate(${-10}, 0)`);

    // Agregar ticks personalizados
    priceAxisGroup.selectAll('.custom-tick')
      .data(customPrices)
      .join('g')
      .attr('class', 'custom-tick')
      .attr('transform', d => `translate(0, ${yScale(d)})`)
      .call(g => {
        // Línea del tick
        g.append('line')
          .attr('x1', 0)
          .attr('x2', 3)
          .attr('y1', 0)
          .attr('y2', 0)
          .attr('stroke', '#666')
          .attr('stroke-width', 0.5);

        // Texto del precio
        g.append('text')
          .attr('x', -5)
          .attr('y', 0)
          .attr('dy', '0.32em')
          .attr('text-anchor', 'end')
          .attr('fill', '#fff')
          .attr('font-size', '10px')
          .text(d => d.toFixed(0));
      });

  }, [data, width, height, currentPrice, priceCoordinates]);

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