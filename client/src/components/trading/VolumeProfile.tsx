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
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([d3.min(data, d => d.price) || 0, d3.max(data, d => d.price) || 0])
      .range([height - 2, 2]); // Dejar un pequeño margen

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
      .attr('x', 0)
      .attr('height', barHeight)
      .attr('width', d => xScale(d.normalizedVolume))
      .attr('fill', d => {
        // Color más intenso para volúmenes más altos
        const intensity = Math.pow(d.normalizedVolume, 0.5); // Ajustar la curva de intensidad
        return d.normalizedVolume > 0 
          ? d3.interpolateRgb('#26a69a33', '#26a69aee')(intensity)
          : '#26a69a11'; // Color muy tenue para barras sin volumen
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