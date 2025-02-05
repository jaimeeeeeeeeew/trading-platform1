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
  visiblePriceRange?: {
    min: number;
    max: number;
  };
  currentPrice: number;
  priceCoordinate: number | null;
}

export const VolumeProfile = ({ 
  data, 
  width, 
  height, 
  visiblePriceRange, 
  currentPrice,
  priceCoordinate 
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length || !visiblePriceRange) return;

    // Filtrar y agrupar datos por niveles de precio de $10
    const groupedData = data.reduce((acc, item) => {
      if (item.price < visiblePriceRange.min || item.price > visiblePriceRange.max) {
        return acc;
      }

      const roundedPrice = Math.round(item.price / 10) * 10;
      const existingGroup = acc.find(g => g.price === roundedPrice);

      if (existingGroup) {
        existingGroup.volume += item.volume;
        existingGroup.normalizedVolume = Math.max(existingGroup.normalizedVolume, item.normalizedVolume);
      } else {
        acc.push({
          price: roundedPrice,
          volume: item.volume,
          normalizedVolume: item.normalizedVolume
        });
      }
      return acc;
    }, [] as typeof data);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Limpiar SVG antes de redibujar
    svg.selectAll('*').remove();

    // Escalas - Invertir el rango del xScale para que vaya de derecha a izquierda
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([width, 0]);  // Cambiado de [0, width] a [width, 0]

    const yScale = d3.scaleLinear()
      .domain([visiblePriceRange.min, visiblePriceRange.max])
      .range([height - 2, 2]);

    // Calcular altura de cada barra basada en el rango de precios visible
    const priceRange = visiblePriceRange.max - visiblePriceRange.min;
    const barHeight = Math.max(1, (height / priceRange) * 10); // 10 dólares por barra

    // Función para calcular la posición Y de cada barra
    const getBarY = (price: number) => {
      if (priceCoordinate !== null && currentPrice) {
        // Calcular el desplazamiento desde el precio actual
        const priceOffset = price - currentPrice;
        // Usar la misma escala que el gráfico principal
        return yScale(price);
      }
      return yScale(price);
    };

    // Función para determinar el color de la barra - Invertir los colores
    const getBarColor = (price: number, normalizedVolume: number) => {
      const isAboveCurrent = price > currentPrice;
      const intensity = Math.pow(normalizedVolume, 0.5);
      return isAboveCurrent 
        ? d3.interpolateRgb('#26a69a88', '#26a69a')(intensity)  // Verde para precios por encima
        : d3.interpolateRgb('#ef535088', '#ef5350')(intensity); // Rojo para precios por debajo
    };

    // Dibujar las barras
    svg.selectAll('rect')
      .data(groupedData)
      .join('rect')
      .attr('y', d => getBarY(d.price))
      .attr('x', d => xScale(d.normalizedVolume))  // Usar el xScale invertido
      .attr('height', barHeight)
      .attr('width', d => width - xScale(d.normalizedVolume))  // Ajustar el ancho según el xScale invertido
      .attr('fill', d => getBarColor(d.price, d.normalizedVolume))
      .attr('opacity', 0.8);

    // Añadir etiquetas de precio
    svg.selectAll('text')
      .data(groupedData)
      .join('text')
      .attr('x', 5)
      .attr('y', d => getBarY(d.price) + barHeight / 2)
      .attr('dy', '0.32em')
      .attr('fill', '#ffffff')
      .attr('font-size', '10px')
      .text(d => d.price.toFixed(0));

  }, [data, width, height, visiblePriceRange, currentPrice, priceCoordinate]);

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