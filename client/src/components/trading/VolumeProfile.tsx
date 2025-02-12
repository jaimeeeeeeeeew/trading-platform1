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
      console.log('Volume Profile: Missing required data', {
        hasData: data?.length > 0,
        hasCoordinates: !!priceCoordinates
      });
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

    // Escala para el volumen
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([maxBarWidth, 0]);

    // Escala para los precios, usando el mismo rango que el gráfico principal
    const yScale = d3.scaleLinear()
      .domain([priceCoordinates.minPrice, priceCoordinates.maxPrice])
      .range([innerHeight, 0]);

    // Filtrar datos dentro del rango visible
    const visibleData = data.filter(d =>
      d.price >= priceCoordinates.minPrice &&
      d.price <= priceCoordinates.maxPrice
    );

    // Dibujar barras de volumen
    g.selectAll('.volume-bar')
      .data(visibleData)
      .join('rect')
      .attr('class', 'volume-bar')
      .attr('x', d => innerWidth - maxBarWidth + xScale(d.normalizedVolume))
      .attr('y', d => {
        const y = yScale(d.price);
        return Number.isFinite(y) ? y : 0;
      })
      .attr('width', d => Math.max(1, maxBarWidth - xScale(d.normalizedVolume)))
      .attr('height', 2)
      .attr('fill', d => d.side === 'bid' ? '#26a69a' : '#ef5350')
      .attr('opacity', 0.8);

    // Línea de precio actual
    if (priceCoordinates.currentPrice) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(priceCoordinates.currentPrice))
        .attr('y2', yScale(priceCoordinates.currentPrice))
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');

      g.append('text')
        .attr('x', innerWidth - maxBarWidth - 5)
        .attr('y', yScale(priceCoordinates.currentPrice))
        .attr('dy', '-4')
        .attr('text-anchor', 'end')
        .attr('fill', '#ffffff')
        .attr('font-size', '10px')
        .text(priceCoordinates.currentPrice.toFixed(1));
    }

    // Eje de precios adaptativo
    const priceAxis = d3.axisRight(yScale)
      .ticks(10)
      .tickFormat((d: any) => {
        if (typeof d === 'number' && Number.isFinite(d)) {
          return `${d.toFixed(0)}`;
        }
        return '';
      });

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

  }, [data, width, height, priceCoordinates]);

  return (
    <div
      style={{
        position: 'absolute',
        right: '80px',
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