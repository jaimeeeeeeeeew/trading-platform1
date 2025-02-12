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
      console.log('No data or coordinates available:', { data, priceCoordinates });
      return;
    }

    console.log('Current price coordinates:', priceCoordinates);
    console.log('Data received:', data.length, 'items');

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

    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, maxBarWidth]);

    // Función mejorada para calcular la posición Y
    const priceToY = (price: number) => {
      // Para el precio actual
      if (price === currentPrice) {
        return priceCoordinates.currentY - margin.top;
      }

      // Para asks (por encima del precio actual)
      if (price > currentPrice) {
        const askRatio = (price - currentPrice) / (priceCoordinates.maxPrice - currentPrice);
        const y = priceCoordinates.currentY - margin.top - (askRatio * (priceCoordinates.currentY - priceCoordinates.maxY));
        console.log('Ask Y calculation:', { price, ratio: askRatio, y });
        return y;
      }

      // Para bids (por debajo del precio actual)
      const bidRatio = (currentPrice - price) / (currentPrice - priceCoordinates.minPrice);
      const y = priceCoordinates.currentY - margin.top + (bidRatio * (priceCoordinates.minY - priceCoordinates.currentY));
      console.log('Bid Y calculation:', { price, ratio: bidRatio, y });
      return y;
    };

    // Altura de las barras
    const barHeight = Math.max(1, (priceCoordinates.minY - priceCoordinates.maxY) / (data.length * 2));

    // Filtrar y ordenar los datos
    const asks = data
      .filter(d => d.side === 'ask' && d.price > currentPrice)
      .sort((a, b) => a.price - b.price);

    const bids = data
      .filter(d => d.side === 'bid' && d.price < currentPrice)
      .sort((a, b) => b.price - a.price);

    console.log('Datos procesados:', {
      asks: asks.length,
      bids: bids.length,
      currentPrice,
      sampleAsk: asks[0],
      sampleBid: bids[0]
    });

    // Combinar los datos manteniendo el orden
    const visibleData = [...asks, ...bids];

    // Dibujar barras de volumen
    g.selectAll('.volume-bar')
      .data(visibleData)
      .join('rect')
      .attr('class', 'volume-bar')
      .attr('x', 0)
      .attr('y', d => {
        const y = priceToY(d.price);
        console.log('Bar position:', { price: d.price, side: d.side, y });
        return y - barHeight / 2;
      })
      .attr('width', d => xScale(d.normalizedVolume))
      .attr('height', barHeight)
      .attr('fill', d => d.side === 'bid' ? '#26a69a' : '#ef5350')
      .attr('opacity', 0.8);

    // Línea de precio actual
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

    // Escala de precios
    const priceRange = priceCoordinates.maxPrice - priceCoordinates.minPrice;
    const numTicks = Math.min(10, Math.floor(innerHeight / 30));
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