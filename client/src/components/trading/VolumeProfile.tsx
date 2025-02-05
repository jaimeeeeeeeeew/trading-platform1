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

    console.log("Rendering volume profile with data:", {
      dataPoints: data.length,
      width,
      height,
      sampleData: data.slice(0, 3)
    });

    // Limpiar SVG existente
    d3.select(svgRef.current).selectAll("*").remove();

    // Crear escalas
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, width]); // Ahora las barras crecen hacia la derecha

    const yScale = d3.scaleLinear()
      .domain([d3.min(data, d => d.price) || 0, d3.max(data, d => d.price) || 0])
      .range([height - 2, 2]);

    const currentPrice = (d3.min(data, d => d.price)! + d3.max(data, d => d.price)!) / 2;

    // Crear SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('overflow', 'visible');

    // Calcular altura de cada barra
    const barHeight = Math.max(2, height / data.length);

    console.log("Dibujando barras con:", {
      numBars: data.length,
      barHeight,
      currentPrice,
      yRange: [d3.min(data, d => d.price), d3.max(data, d => d.price)]
    });

    // Dibujar barras horizontales
    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('y', d => yScale(d.price))
      .attr('x', 0)
      .attr('height', barHeight)
      .attr('width', d => xScale(d.normalizedVolume))
      .attr('fill', d => {
        const isAboveCurrent = d.price > currentPrice;
        const intensity = Math.pow(d.normalizedVolume, 0.5);

        if (isAboveCurrent) {
          return d3.interpolateRgb('#ef535088', '#ef5350')(intensity);
        } else {
          return d3.interpolateRgb('#26a69a88', '#26a69a')(intensity);
        }
      })
      .attr('opacity', 1);

  }, [data, width, height]);

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