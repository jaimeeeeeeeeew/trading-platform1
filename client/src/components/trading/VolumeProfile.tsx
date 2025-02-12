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

  // Función para agrupar un lado del libro
  const groupSide = (orders: Props['data']) => {
    if (orders.length === 0) return { groupedData: [], groupFactor: 1 };

    // Paso 1: Agrupar por precio exacto primero
    const priceGroups = new Map<number, Props['data'][0]>();
    orders.forEach(order => {
      if (priceGroups.has(order.price)) {
        const existing = priceGroups.get(order.price)!;
        existing.volume += order.volume;
      } else {
        priceGroups.set(order.price, { ...order });
      }
    });

    let currentData = Array.from(priceGroups.values());

    // Paso 2: Si hay demasiadas barras, combinar adyacentes
    while (currentData.length > maxBars / 2) {
      const newData: Props['data'] = [];

      // Ordenar por precio para asegurar combinación correcta
      currentData.sort((a, b) => a.price - b.price);

      for (let i = 0; i < currentData.length; i += 2) {
        if (i + 1 < currentData.length) {
          // Combinar dos barras adyacentes
          const volumeSum = currentData[i].volume + currentData[i + 1].volume;
          // Precio ponderado por volumen
          const weightedPrice = 
            (currentData[i].price * currentData[i].volume + 
             currentData[i + 1].price * currentData[i + 1].volume) / volumeSum;

          newData.push({
            price: weightedPrice,
            volume: volumeSum,
            normalizedVolume: 0, // Se calculará después
            side: currentData[i].side
          });
        } else {
          // Si queda una barra sin par, mantenerla
          newData.push(currentData[i]);
        }
      }

      currentData = newData;
    }

    return {
      groupedData: currentData,
      groupFactor: Math.ceil(orders.length / (maxBars / 2))
    };
  };

  // Agrupar cada lado por separado
  const { groupedData: groupedBids, groupFactor: bidGroupFactor } = groupSide(bids);
  const { groupedData: groupedAsks, groupFactor: askGroupFactor } = groupSide(asks);

  // Combinar resultados y normalizar volúmenes
  const combinedData = [...groupedBids, ...groupedAsks];
  const maxVolume = Math.max(...combinedData.map(d => d.volume));

  const normalizedData = combinedData.map(d => ({
    ...d,
    normalizedVolume: d.volume / maxVolume
  }));

  return {
    groupedData: normalizedData,
    groupFactor: Math.max(bidGroupFactor, askGroupFactor),
    totalVolume: data.reduce((sum, d) => sum + d.volume, 0)
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

    console.log('Datos del perfil de volumen:', {
      datosVisibles: visibleData.length,
      datosAgrupados: groupedData.length,
      factorAgrupacion: groupFactor,
      volumenTotal: totalVolume
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Ajustamos los márgenes para dar más espacio a las barras
    const margin = { top: 20, right: 30, bottom: 20, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Aumentamos el ancho máximo de las barras al 70% del espacio disponible
    const maxBarWidth = innerWidth * 0.7;

    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([maxBarWidth, 0]); // Invertimos el rango para que vaya de derecha a izquierda

    const priceToY = (price: number) => {
      if (!priceCoordinates) return 0;

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

    // Aumentamos la altura mínima de las barras para hacerlas más visibles
    const barHeight = Math.max(2, (priceCoordinates.minY - priceCoordinates.maxY) / (groupedData.length * 1.5));

    const asks = groupedData
      .filter(d => d.side === 'ask')
      .sort((a, b) => a.price - b.price);

    const bids = groupedData
      .filter(d => d.side === 'bid')
      .sort((a, b) => b.price - a.price);

    // Debug de valores calculados
    console.log('Dimensiones y escalas:', {
      innerWidth,
      innerHeight,
      maxBarWidth,
      barHeight,
      bidsCount: bids.length,
      asksCount: asks.length
    });

    // Etiquetas de precio
    const allPrices = [...bids, ...asks].sort((a, b) => a.price - b.price);
    allPrices.forEach((d, i) => {
      if (i % 2 === 0) {
        g.append('text')
          .attr('class', 'price-label')
          .attr('x', -5)
          .attr('y', priceToY(d.price))
          .attr('dy', '0.32em')
          .attr('text-anchor', 'end')
          .attr('fill', '#ffffff')
          .attr('font-size', '10px')
          .text(`${d.price.toFixed(1)}`);
      }
    });

    // Barras de volumen con opacidad aumentada
    g.selectAll('.bid-bars')
      .data(bids)
      .join('rect')
      .attr('class', 'volume-bar bid')
      .attr('x', d => xScale(d.normalizedVolume)) // La x ahora es el punto final de la barra
      .attr('y', d => {
        const y = priceToY(d.price);
        return isNaN(y) ? 0 : y - barHeight / 2;
      })
      .attr('width', d => maxBarWidth - xScale(d.normalizedVolume)) // El ancho es la diferencia
      .attr('height', barHeight)
      .attr('fill', '#26a69a')
      .attr('opacity', 0.9);

    g.selectAll('.ask-bars')
      .data(asks)
      .join('rect')
      .attr('class', 'volume-bar ask')
      .attr('x', d => xScale(d.normalizedVolume)) // La x ahora es el punto final de la barra
      .attr('y', d => {
        const y = priceToY(d.price);
        return isNaN(y) ? 0 : y - barHeight / 2;
      })
      .attr('width', d => maxBarWidth - xScale(d.normalizedVolume)) // El ancho es la diferencia
      .attr('height', barHeight)
      .attr('fill', '#ef5350')
      .attr('opacity', 0.9);

    // Línea de precio actual más visible
    if (priceCoordinates.currentPrice && priceCoordinates.currentY) {
      g.append('line')
        .attr('class', 'price-line')
        .attr('x1', -5)
        .attr('x2', innerWidth)
        .attr('y1', priceCoordinates.currentY - margin.top)
        .attr('y2', priceCoordinates.currentY - margin.top)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '2,2');

      g.append('text')
        .attr('class', 'current-price-label')
        .attr('x', innerWidth + 5)
        .attr('y', priceCoordinates.currentY - margin.top)
        .attr('dy', '0.32em')
        .attr('text-anchor', 'start')
        .attr('fill', '#ffffff')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
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