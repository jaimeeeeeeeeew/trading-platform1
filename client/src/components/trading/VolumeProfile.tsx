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
}

export const VolumeProfile = ({ data, width, height }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) {
      console.log("No SVG ref or no data", { hasRef: !!svgRef.current, dataLength: data.length });
      return;
    }

    console.log("Rendering volume profile with data:", { data, width, height });

    // Limpiar SVG existente
    d3.select(svgRef.current).selectAll("*").remove();

    // Crear escalas
    const xScale = d3.scaleLinear()
      .domain([0, 1]) // Usar valores normalizados
      .range([width, 0]); // Invertir el rango para que crezca hacia la izquierda

    const yScale = d3.scaleLinear()
      .domain([d3.min(data, d => d.price) || 0, d3.max(data, d => d.price) || 0])
      .range([height - 2, 2]); // Dejar un pequeño margen

    // Obtener el precio actual (punto medio del rango)
    const currentPrice = (d3.min(data, d => d.price)! + d3.max(data, d => d.price)!) / 2;

    // Crear SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Calcular altura de cada barra
    const barHeight = Math.max(1, height / data.length * 0.8); // 80% del espacio disponible

    // Dibujar barras horizontales
    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('y', d => yScale(d.price) - barHeight / 2)
      .attr('x', d => xScale(d.normalizedVolume)) // Posicionar desde la derecha
      .attr('height', barHeight)
      .attr('width', d => width - xScale(d.normalizedVolume)) // Ancho ajustado para crecer hacia la izquierda
      .attr('fill', d => {
        // Color basado en la posición relativa al precio actual
        const isAboveCurrent = d.price > currentPrice;
        const intensity = Math.pow(d.normalizedVolume, 0.5); // Ajustar la curva de intensidad

        if (d.normalizedVolume === 0) {
          return '#26262611'; // Color muy tenue para barras sin volumen
        }

        if (isAboveCurrent) {
          // Rojo para precios por encima
          return d3.interpolateRgb('#ef535033', '#ef5350ee')(intensity);
        } else {
          // Verde para precios por debajo
          return d3.interpolateRgb('#26a69a33', '#26a69aee')(intensity);
        }
      })
      .attr('opacity', d => d.normalizedVolume > 0 ? 0.8 : 0.3);

  }, [data, width, height]);

  return (
    <svg 
      ref={svgRef} 
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 10,
        background: 'transparent'
      }}
    />
  );
};