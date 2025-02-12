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
  maxVisibleBars: number;
}

interface PriceCoordinates {
  currentPrice: number;
  currentY: number;
  minPrice: number;
  minY: number;
  maxPrice: number;
  maxY: number;
}

const groupDataByBars = (data: Props['data'], maxBars: number) => {
  // Separar bids y asks
  const bids = data.filter(d => d.side === 'bid');
  const asks = data.filter(d => d.side === 'ask');

  // Calcular volumen total original para verificación
  const originalTotalVolume = data.reduce((sum, d) => sum + d.volume, 0);
  const originalBidVolume = bids.reduce((sum, d) => sum + d.volume, 0);
  const originalAskVolume = asks.reduce((sum, d) => sum + d.volume, 0);

  console.log('Volúmenes originales:', {
    total: originalTotalVolume,
    bids: originalBidVolume,
    asks: originalAskVolume
  });

  // Función para agrupar un lado del libro
  const groupSide = (orders: Props['data']) => {
    let currentData = [...orders];
    let groupFactor = 1;

    while (currentData.length > maxBars / 2) { // Dividir maxBars entre bids y asks
      const newData: Props['data'] = [];
      for (let i = 0; i < currentData.length; i += 2) {
        if (i + 1 < currentData.length) {
          // Sumar volúmenes y promediar precios
          newData.push({
            price: (currentData[i].price + currentData[i + 1].price) / 2,
            volume: currentData[i].volume + currentData[i + 1].volume,
            normalizedVolume: 0, // Se calculará después
            side: currentData[i].side
          });
        } else {
          // Si queda uno solo, mantenerlo
          newData.push(currentData[i]);
        }
      }
      currentData = newData;
      groupFactor *= 2;
    }

    return { groupedData: currentData, groupFactor };
  };

  // Agrupar cada lado por separado
  const { groupedData: groupedBids, groupFactor: bidGroupFactor } = groupSide(bids);
  const { groupedData: groupedAsks, groupFactor: askGroupFactor } = groupSide(asks);

  // Combinar resultados
  const combinedData = [...groupedBids, ...groupedAsks];

  // Verificar volumen total después de agrupar
  const groupedTotalVolume = combinedData.reduce((sum, d) => sum + d.volume, 0);
  const groupedBidVolume = groupedBids.reduce((sum, d) => sum + d.volume, 0);
  const groupedAskVolume = groupedAsks.reduce((sum, d) => sum + d.volume, 0);

  console.log('Volúmenes después de agrupar:', {
    total: groupedTotalVolume,
    bids: groupedBidVolume,
    asks: groupedAskVolume,
    diferenciaBids: originalBidVolume - groupedBidVolume,
    diferenciaAsks: originalAskVolume - groupedAskVolume
  });

  // Normalizar volúmenes
  const maxVolume = Math.max(...combinedData.map(d => d.volume));
  const normalizedData = combinedData.map(d => ({
    ...d,
    normalizedVolume: d.volume / maxVolume
  }));

  return {
    groupedData: normalizedData,
    groupFactor: Math.max(bidGroupFactor, askGroupFactor),
    totalVolume: originalTotalVolume
  };
};

export const VolumeProfile = ({
  data,
  width = 150,
  height,
  visiblePriceRange,
  currentPrice,
  priceCoordinate,
  priceCoordinates,
  maxVisibleBars
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

    // Filtrar datos por rango visible y agrupar si es necesario
    const visibleData = data.filter(
      d => d.price >= visiblePriceRange.min && d.price <= visiblePriceRange.max
    );

    const { groupedData, groupFactor, totalVolume } = groupDataByBars(visibleData, maxVisibleBars);

    console.log('Procesamiento de datos:', {
      datosVisibles: visibleData.length,
      datosAgrupados: groupedData.length,
      factorAgrupacion: groupFactor
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 25, right: 50, bottom: 25, left: 95 };
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

    // Etiquetas de precio con volumen total
    const allPrices = [...bids, ...asks].sort((a, b) => a.price - b.price);
    allPrices.forEach((d, i) => {
      if (i % 2 === 0) {
        g.append('text')
          .attr('class', 'price-label')
          .attr('x', -8)
          .attr('y', priceToY(d.price))
          .attr('dy', '0.32em')
          .attr('text-anchor', 'end')
          .attr('fill', '#ffffff')
          .attr('font-size', '10px')
          .text(`${d.price.toFixed(1)} (${d.volume.toFixed(3)} BTC)`);
      } else {
        g.append('text')
          .attr('class', 'price-label')
          .attr('x', -8)
          .attr('y', priceToY(d.price))
          .attr('dy', '0.32em')
          .attr('text-anchor', 'end')
          .attr('fill', '#666')
          .attr('font-size', '10px')
          .text(`${d.price.toFixed(1)}`);
      }
    });

    // Barras de volumen
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

  }, [data, width, height, currentPrice, priceCoordinates, visiblePriceRange, maxVisibleBars]);

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