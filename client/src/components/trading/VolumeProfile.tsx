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
}

export const VolumeProfile = ({ 
  data, 
  width, 
  height,
  visiblePriceRange,
  currentPrice,
  priceCoordinates
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) {
      console.log('⚠️ Volume Profile not rendering:', {
        hasRef: !!svgRef.current,
        dataLength: data?.length,
        sampleData: data?.[0]
      });
      return;
    }

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      // Set SVG dimensions
      svg
        .attr('width', width)
        .attr('height', height);

      // Calculate scales
      const maxVolume = Math.max(...data.map(d => d.volume));
      const minPrice = Math.min(...data.map(d => d.price));
      const maxPrice = Math.max(...data.map(d => d.price));

      console.log('📊 Rendering volume profile:', {
        maxVolume,
        priceRange: { min: minPrice, max: maxPrice },
        bars: data.length
      });

      // Simple horizontal bar chart
      const barHeight = Math.max(2, (height * 0.8) / data.length);
      const barPadding = 1;

      const xScale = d3.scaleLinear()
        .domain([0, maxVolume])
        .range([0, width * 0.8]);

      const yScale = d3.scaleLinear()
        .domain([minPrice, maxPrice])
        .range([height * 0.9, height * 0.1]);

      // Draw background
      svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'rgba(21, 25, 36, 0.95)')
        .attr('stroke', 'rgba(255, 255, 255, 0.3)')
        .attr('stroke-width', 2);

      // Draw bars
      svg.selectAll('.volume-bar')
        .data(data)
        .join('rect')
        .attr('class', 'volume-bar')
        .attr('x', 0)
        .attr('y', d => yScale(d.price))
        .attr('width', d => xScale(d.volume))
        .attr('height', barHeight - barPadding)
        .attr('fill', d => d.side === 'ask' ? '#ef5350' : '#26a69a')
        .attr('opacity', 0.8);

      // Draw current price line
      if (currentPrice) {
        svg.append('line')
          .attr('x1', 0)
          .attr('x2', width)
          .attr('y1', yScale(currentPrice))
          .attr('y2', yScale(currentPrice))
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4,4');
      }

      // Add price labels
      svg.selectAll('.price-label')
        .data([minPrice, currentPrice, maxPrice].filter(Boolean))
        .join('text')
        .attr('class', 'price-label')
        .attr('x', width - 5)
        .attr('y', d => yScale(d))
        .attr('text-anchor', 'end')
        .attr('fill', 'white')
        .attr('font-size', '10px')
        .text(d => d.toFixed(0));

    } catch (error) {
      console.error('❌ Error rendering volume profile:', error);
    }
  }, [data, width, height, currentPrice]);

  return (
    <div 
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: `${width}px`,
        height: '100%',
        background: 'rgba(21, 25, 36, 0.95)',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        zIndex: 1000,
      }}
    >
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          padding: '4px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          fontSize: '10px',
          zIndex: 1001
        }}
      >
        Volume Profile Bars: {data.length}
      </div>
      <svg 
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
};