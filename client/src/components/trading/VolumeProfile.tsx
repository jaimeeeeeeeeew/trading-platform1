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

    const margin = { top: 25, right: 10, bottom: 25, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxBarWidth = innerWidth * 0.8;

    // Escala X para el ancho de las barras
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, maxBarWidth]);

    // Usar directamente las coordenadas Y del gráfico principal
    const priceToY = (price: number) => {
      if (price === currentPrice) return priceCoordinates.currentY - margin.top;

      // Para asks (por encima del precio actual)
      if (price > currentPrice) {
        const ratio = (price - currentPrice) / (priceCoordinates.maxPrice - currentPrice);
        return priceCoordinates.currentY - margin.top - (ratio * (priceCoordinates.currentY - priceCoordinates.maxY));
      }

      // Para bids (por debajo del precio actual)
      const ratio = (currentPrice - price) / (currentPrice - priceCoordinates.minPrice);
      return priceCoordinates.currentY - margin.top + (ratio * (priceCoordinates.minY - priceCoordinates.currentY));
    };

    // Calcular altura de las barras
    const barHeight = Math.max(1, (priceCoordinates.minY - priceCoordinates.maxY) / (data.length * 2));

    // Filtrar y ordenar datos dentro del rango visible
    const padding = (priceCoordinates.maxPrice - priceCoordinates.minPrice) * 0.05;
    const visibleData = data
      .filter(d => d.price >= (priceCoordinates.minPrice - padding) && 
                  d.price <= (priceCoordinates.maxPrice + padding))
      .sort((a, b) => {
        // Si son del mismo lado (asks o bids)
        if (a.side === b.side) {
          if (a.side === 'ask') {
            return b.price - a.price; // asks ordenados de mayor a menor
          }
          return a.price - b.price; // bids ordenados de menor a mayor
        }
        // Si son diferentes, asks primero
        return a.side === 'ask' ? -1 : 1;
      });

    // Dibujar barras de volumen
    g.selectAll('.volume-bar')
      .data(visibleData)
      .join('rect')
      .attr('class', 'volume-bar')
      .attr('x', 0)
      .attr('y', d => priceToY(d.price) - barHeight / 2)
      .attr('width', d => xScale(d.normalizedVolume))
      .attr('height', barHeight)
      .attr('fill', d => d.side === 'bid' ? '#26a69a' : '#ef5350')
      .attr('opacity', 0.8);

    // Dibujar línea de precio actual
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

      // Etiqueta de precio actual
      g.append('text')
        .attr('class', 'price-label')
        .attr('x', -8)
        .attr('y', priceCoordinates.currentY - margin.top)
        .attr('dy', '0.32em')
        .attr('text-anchor', 'end')
        .attr('fill', '#ffffff')
        .attr('font-size', '10px')
        .text(priceCoordinates.currentPrice.toFixed(1));
    }

    // Añadir escala de precios
    const priceRange = priceCoordinates.maxPrice - priceCoordinates.minPrice;
    const numTicks = Math.min(10, Math.floor(innerHeight / 30)); // Ajustar número de ticks según altura
    const tickPrices = d3.range(numTicks).map(i => {
      const price = priceCoordinates.minPrice + (i * priceRange / (numTicks - 1));
      return {
        price,
        y: priceToY(price)
      };
    });

    const priceAxis = g.append('g')
      .attr('class', 'price-axis')
      .attr('transform', `translate(${-8}, 0)`);

    tickPrices.forEach(({ price, y }) => {
      if (Number.isFinite(y)) {
        priceAxis.append('line')
          .attr('x1', 0)
          .attr('x2', 3)
          .attr('y1', y)
          .attr('y2', y)
          .attr('stroke', '#666')
          .attr('stroke-width', 0.5);

        priceAxis.append('text')
          .attr('x', -5)
          .attr('y', y)
          .attr('dy', '0.32em')
          .attr('text-anchor', 'end')
          .attr('fill', '#fff')
          .attr('font-size', '10px')
          .text(price.toFixed(0));
      }
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