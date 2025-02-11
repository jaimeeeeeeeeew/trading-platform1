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
      console.log('Estado de los datos del perfil:', {
        tieneRef: !!svgRef.current,
        datosLength: data?.length,
        tieneCoords: !!priceCoordinates,
        tieneRango: !!visibleLogicalRange,
        datosRecibidos: data
      });
      return;
    }

    try {
      // Limpiar el SVG
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      svg.attr('width', width).attr('height', height);

      // Calcular volumen normalizado
      const maxVolume = Math.max(...data.map(d => d.volume));
      const normalizedData = data.map(d => ({
        ...d,
        normalizedVolume: d.volume / maxVolume
      }));

      console.log('Datos normalizados:', {
        cantidadDatos: normalizedData.length,
        primerDato: normalizedData[0],
        ultimoDato: normalizedData[normalizedData.length - 1],
        maxVolume
      });

      // Configurar escalas
      const xScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, width - 20]); // Dejar espacio para las etiquetas

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

      // Crear grupo para las barras
      const barsGroup = svg.append('g')
        .attr('class', 'bars-group');

      // Dibujar barras con transición
      barsGroup.selectAll('rect')
        .data(normalizedData)
        .join(
          enter => enter.append('rect')
            .attr('x', 0)
            .attr('y', d => priceScale(d.price))
            .attr('width', 0)
            .attr('height', barHeight)
            .attr('fill', d => getBarColor(d.price, d.volume))
            .call(enter => enter.transition()
              .duration(300)
              .attr('width', d => xScale(d.normalizedVolume))
            ),
          update => update
            .call(update => update.transition()
              .duration(300)
              .attr('y', d => priceScale(d.price))
              .attr('width', d => xScale(d.normalizedVolume))
              .attr('fill', d => getBarColor(d.price, d.volume))
            ),
          exit => exit
            .call(exit => exit.transition()
              .duration(300)
              .attr('width', 0)
              .remove()
            )
        );

      // Añadir etiquetas de precio y volumen si hay espacio
      if (barHeight >= 8) {
        const labelsGroup = svg.append('g')
          .attr('class', 'labels-group');

        labelsGroup.selectAll('text')
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