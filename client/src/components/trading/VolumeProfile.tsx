import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Props {
  data: {
    price: number;
    volume: number;
    normalizedVolume: number;
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
      console.log('Esperando datos para renderizar el perfil de volumen:', {
        tieneRef: !!svgRef.current,
        datosLength: data?.length,
        tieneCoords: !!priceCoordinates,
        tieneRango: !!visibleLogicalRange
      });
      return;
    }

    try {
      // Limpiar el SVG
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      svg.attr('width', width).attr('height', height);

      // Procesar y agrupar datos por nivel de precio
      const priceStep = 10; // Agrupar cada $10
      const volumeByPrice = new Map<number, number>();

      data.forEach(item => {
        const priceLevel = Math.floor(item.price / priceStep) * priceStep;
        const currentVolume = volumeByPrice.get(priceLevel) || 0;
        volumeByPrice.set(priceLevel, currentVolume + item.volume);
      });

      // Convertir a array y calcular volumen normalizado
      const processedData = Array.from(volumeByPrice.entries()).map(([price, volume]) => ({
        price,
        volume,
        normalizedVolume: 0
      }));

      // Calcular volumen normalizado
      const maxVolume = Math.max(...processedData.map(d => d.volume));
      const normalizedData = processedData.map(data => ({
        ...data,
        normalizedVolume: data.volume / maxVolume
      }));

      console.log('Datos procesados para el perfil:', {
        nivelesDePrecio: normalizedData.length,
        rangoDePrecio: {
          min: Math.min(...normalizedData.map(d => d.price)),
          max: Math.max(...normalizedData.map(d => d.price))
        },
        volumenMax: maxVolume
      });

      // Configurar escalas
      const xScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, width]);

      const priceScale = d3.scaleLinear()
        .domain([priceCoordinates.minPrice, priceCoordinates.maxPrice])
        .range([priceCoordinates.maxY, priceCoordinates.minY]);

      // Calcular altura de las barras
      const barHeight = Math.max(2, height / normalizedData.length / 2);

      // Función para color de barras
      const getBarColor = (price: number, volume: number) => {
        const isAboveCurrent = price > currentPrice;
        const alpha = Math.min(0.8, 0.3 + (volume / maxVolume) * 0.7);
        return isAboveCurrent 
          ? `rgba(38, 166, 154, ${alpha})` // Verde para precios por encima
          : `rgba(239, 83, 80, ${alpha})`; // Rojo para precios por debajo
      };

      // Dibujar barras
      svg.selectAll('rect')
        .data(normalizedData)
        .join('rect')
        .attr('x', 0)
        .attr('y', d => priceScale(d.price))
        .attr('width', d => xScale(d.normalizedVolume))
        .attr('height', barHeight)
        .attr('fill', d => getBarColor(d.price, d.volume))
        .attr('opacity', 1);

      // Añadir etiquetas de precio y volumen si hay espacio
      if (barHeight >= 8) {
        svg.selectAll('text')
          .data(normalizedData)
          .join('text')
          .attr('x', 5)
          .attr('y', d => priceScale(d.price) + barHeight / 2)
          .attr('dy', '0.32em')
          .attr('font-size', '10px')
          .attr('fill', '#ffffff')
          .text(d => `${d.price.toFixed(0)} (${d.volume.toFixed(1)})`);
      }

    } catch (error) {
      console.error('Error renderizando perfil de volumen:', error);
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
        background: 'transparent',
      }}
    />
  );
};