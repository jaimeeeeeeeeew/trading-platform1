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
    if (!svgRef.current || !data || data.length === 0) return;

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

    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([maxBarWidth, 0]);

    // Asegurar que los valores del dominio sean números válidos
    const yMin = Number.isFinite(visiblePriceRange.min) ? visiblePriceRange.min : 0;
    const yMax = Number.isFinite(visiblePriceRange.max) ? visiblePriceRange.max : 100000;

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([innerHeight, 0]);

    // Altura fija para las barras, ajustada para incrementos de $10
    const barHeight = Math.max(2, (innerHeight / ((yMax - yMin) / 10)));

    // Dibujar barras de volumen
    const bars = g.selectAll('.volume-bar')
      .data(data)
      .join('rect')
      .attr('class', 'volume-bar')
      .attr('x', d => innerWidth - maxBarWidth + xScale(d.normalizedVolume))
      .attr('y', d => {
        const y = yScale(d.price);
        return Number.isFinite(y) ? y - barHeight / 2 : 0;
      })
      .attr('width', d => Math.max(1, maxBarWidth - xScale(d.normalizedVolume)))
      .attr('height', barHeight)
      .attr('fill', d => d.side === 'bid' ? '#26a69a' : '#ef5350')
      .attr('opacity', 0.8);

    // Agregar etiquetas de precio a la izquierda de cada barra
    g.selectAll('.price-label')
      .data(data)
      .join('text')
      .attr('class', 'price-label')
      .attr('x', -5)
      .attr('y', d => {
        const y = yScale(d.price);
        if (Number.isFinite(y)) {
          console.log(`Price: ${d.price}, Y coordinate: ${y}`);
          return y;
        }
        return 0;
      })
      .attr('text-anchor', 'end')
      .attr('alignment-baseline', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', '10px')
      .text(d => {
        const y = yScale(d.price);
        return Number.isFinite(y) ? `${d.price.toFixed(0)} (${y.toFixed(1)})` : d.price.toFixed(0);
      });

    // Línea de precio actual
    if (currentPrice && Number.isFinite(yScale(currentPrice))) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(currentPrice))
        .attr('y2', yScale(currentPrice))
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');

      g.append('text')
        .attr('x', innerWidth - maxBarWidth - 5)
        .attr('y', yScale(currentPrice))
        .attr('dy', '-4')
        .attr('text-anchor', 'end')
        .attr('fill', '#ffffff')
        .attr('font-size', '10px')
        .text(currentPrice.toFixed(1));
    }

    // Eje de precios con incrementos de $10
    const priceAxis = d3.axisRight(yScale)
      .ticks((yMax - yMin) / 10)
      .tickFormat((d: any) => {
        if (typeof d === 'number' && Number.isFinite(d)) {
          const y = yScale(d);
          if (Number.isFinite(y)) {
            console.log(`Scale Price: ${d}, Y coordinate: ${y}`);
            return `${d.toFixed(0)} (${y.toFixed(1)})`;
          }
        }
        return '';
      })
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
      .attr('x', innerWidth - maxBarWidth)
      .attr('y', 15)
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .text(`Vol Profile (${data.length})`);

    // Seleccionar 2 barras aleatorias y mostrar sus coordenadas
    const randomBars = data
      .sort(() => 0.5 - Math.random())
      .slice(0, 2);

    randomBars.forEach((bar, i) => {
      const y = yScale(bar.price);
      console.log(`📊 Barra de volumen aleatoria ${i + 1}:`, {
        precio: bar.price,
        coordenadaY: y,
        volumen: bar.volume
      });
    });
  }, [data, width, height, visiblePriceRange, currentPrice]);

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