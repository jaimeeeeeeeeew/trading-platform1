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
  priceCoordinates: {
    currentPrice: number;
    currentY: number;
    minPrice: number;
    minY: number;
    maxPrice: number;
    maxY: number;
  } | null;
}

export const VolumeProfile = ({ 
  data, 
  width, 
  height,
  visiblePriceRange,
  currentPrice,
  priceCoordinate,
  priceCoordinates
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length || !visiblePriceRange || !priceCoordinates) return;

    // Filtrar y agrupar datos por niveles de precio de $50
    const groupedData = data.reduce((acc, item) => {
      if (item.price < visiblePriceRange.min || item.price > visiblePriceRange.max) {
        return acc;
      }

      const roundedPrice = Math.round(item.price / 50) * 50;
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

    svg.selectAll('*').remove();

    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([width, 0]);

    const priceToY = d3.scaleLinear()
      .domain([priceCoordinates.minPrice, priceCoordinates.maxPrice])
      .range([priceCoordinates.minY, priceCoordinates.maxY]);

    const getBarY = (price: number) => {
      return priceToY(price);
    };

    // Calculate bar height based on price scale and 50$ intervals
    const pixelsPerPrice = Math.abs(priceCoordinates.maxY - priceCoordinates.minY) / 
                          (priceCoordinates.maxPrice - priceCoordinates.minPrice);
    const barHeight = Math.max(1, pixelsPerPrice * 50); // 50 dollars per bar

    const getBarColor = (price: number, normalizedVolume: number) => {
      const isAboveCurrent = price > currentPrice;
      const intensity = Math.pow(normalizedVolume, 0.5);
      return isAboveCurrent 
        ? d3.interpolateRgb('#26a69a88', '#26a69a')(intensity)
        : d3.interpolateRgb('#ef535088', '#ef5350')(intensity);
    };

    // Draw bars
    svg.selectAll('rect')
      .data(groupedData)
      .join('rect')
      .attr('y', d => getBarY(d.price))
      .attr('x', d => xScale(d.normalizedVolume))
      .attr('height', barHeight)
      .attr('width', d => width - xScale(d.normalizedVolume))
      .attr('fill', d => getBarColor(d.price, d.normalizedVolume))
      .attr('opacity', 0.8);

    // Add price labels
    svg.selectAll('text')
      .data(groupedData)
      .join('text')
      .attr('x', 5)
      .attr('y', d => getBarY(d.price) + barHeight / 2)
      .attr('dy', '0.32em')
      .attr('fill', '#ffffff')
      .attr('font-size', '10px')
      .text(d => d.price.toFixed(0));

  }, [data, width, height, visiblePriceRange, currentPrice, priceCoordinate, priceCoordinates]);

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