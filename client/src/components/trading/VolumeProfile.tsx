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
      // Logs detallados de los datos que recibimos
      console.log('📊 Datos del perfil de volumen:', {
        totalPuntos: data.length,
        primerPunto: data[0],
        ultimoPunto: data[data.length - 1],
        rangoPrecios: visiblePriceRange,
        dimensiones: { width, height },
        precioActual: currentPrice
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
        .style('z-index', '100'); // Aseguramos que esté por encima

      const maxVolume = Math.max(...data.map(d => d.volume));
      console.log('📊 Volumen máximo:', maxVolume);

      // Ajustamos la escala para que las barras sean más visibles
      const xScale = d3.scaleLinear()
        .domain([0, maxVolume])
        .range([0, width * 0.8]); // Usamos 80% del ancho disponible

      const yScale = d3.scaleLinear()
        .domain([visiblePriceRange.min, visiblePriceRange.max])
        .range([height, 0]);

      // Grupo para las barras
      const barsGroup = svg.append('g')
        .style('transform', 'translateX(0)');

      // Aumentamos el tamaño mínimo de las barras
      const barHeight = Math.max(2, height / (visiblePriceRange.max - visiblePriceRange.min));
      console.log('📊 Altura de barra:', barHeight);

      const bars = barsGroup.selectAll('rect')
        .data(data)
        .join('rect')
        .attr('x', 0)
        .attr('y', d => yScale(d.price))
        .attr('width', d => Math.max(1, xScale(d.volume))) // Ancho mínimo de 1px
        .attr('height', barHeight)
        .attr('fill', d => {
          const alpha = Math.min(0.9, 0.4 + (d.volume / maxVolume) * 0.6); // Aumentamos la opacidad
          return d.side === 'ask' 
            ? `rgba(239, 83, 80, ${alpha})` // Rojo para asks
            : `rgba(38, 166, 154, ${alpha})`; // Verde para bids
        });

      console.log('📊 Barras renderizadas:', {
        cantidad: bars.size(),
        ejemploAltura: barHeight,
        ejemploAncho: xScale(data[0]?.volume || 0)
      });

      // Línea del precio actual con más visibilidad
      if (currentPrice) {
        svg.append('line')
          .attr('x1', 0)
          .attr('y1', yScale(currentPrice))
          .attr('x2', width)
          .attr('y2', yScale(currentPrice))
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2)  // Línea más gruesa
          .attr('stroke-dasharray', '4,4'); // Patrón de línea más visible
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
        backgroundColor: 'rgba(21, 25, 36, 0.8)', // Fondo más oscuro
        border: '1px solid rgba(255, 255, 255, 0.1)', // Borde sutil
      }}
    />
  );
};