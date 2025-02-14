import { useEffect, useRef, useMemo } from 'react';
import REGL, { Regl } from 'regl';

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
  grouping: '1' | '5' | '10';
}

interface PriceCoordinates {
  currentPrice: number;
  currentY: number;
  minPrice: number;
  minY: number;
  maxPrice: number;
  maxY: number;
}

const vertexShader = `
  precision mediump float;
  attribute vec2 position;
  attribute float side;
  attribute float volume;
  uniform float aspectRatio;
  uniform vec2 scale;
  uniform vec2 translate;
  uniform float yScale;
  uniform float yOffset;
  uniform float viewportHeight;
  uniform float minY;
  uniform float maxY;
  uniform float priceMin;
  uniform float priceMax;

  varying float vSide;
  varying float vVolume;

  void main() {
    vSide = side;
    vVolume = volume;

    // Mantener coordenada X invertida (derecha a izquierda)
    float x = -position.x;

    // Mapear el precio al rango de coordenadas Y
    float y = position.y;
    float priceRange = priceMax - priceMin;
    float coordRange = maxY - minY;

    // Invertir el mapeo para que coincida con la dirección del gráfico
    y = maxY - (((y - priceMin) / priceRange) * coordRange);

    // Normalizar al espacio de coordenadas de WebGL
    y = (y / viewportHeight) * 2.0 - 1.0;

    // Aplicar escala y traslación
    x = x * scale.x + translate.x;

    gl_Position = vec4(x, y, 0, 1);
  }
`;

const fragmentShader = `
  precision mediump float;
  varying float vSide;
  varying float vVolume;
  uniform vec3 bidColor;
  uniform vec3 askColor;
  uniform float opacity;

  void main() {
    vec3 color = vSide > 0.5 ? askColor : bidColor;
    float alpha = max(opacity * vVolume, 0.2);
    gl_FragColor = vec4(color, alpha);
  }
`;

export const VolumeProfileGL = ({
  data,
  width,
  height,
  visiblePriceRange,
  currentPrice,
  priceCoordinates,
  grouping,
  maxVisibleBars
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reglRef = useRef<Regl | null>(null);

  const processedData = useMemo(() => {
    if (!data || data.length === 0 || !priceCoordinates) return null;

    const groupSize = parseInt(grouping);
    const filteredData = data.filter(
      d => d.price >= visiblePriceRange.min && d.price <= visiblePriceRange.max
    );

    const groupedData = new Map();
    filteredData.forEach(item => {
      const key = Math.floor(item.price / groupSize) * groupSize;
      if (!groupedData.has(key)) {
        groupedData.set(key, {
          price: key,
          volume: 0,
          side: item.side
        });
      }
      const group = groupedData.get(key);
      group.volume += item.volume;
    });

    const result = Array.from(groupedData.values());
    const maxVolume = Math.max(...result.map(d => d.volume));

    return result.map(d => ({
      ...d,
      normalizedVolume: d.volume / maxVolume
    }));

  }, [data, visiblePriceRange, grouping, priceCoordinates]);

  useEffect(() => {
    if (!canvasRef.current || !processedData || processedData.length === 0 || !priceCoordinates) return;

    try {
      if (!reglRef.current) {
        reglRef.current = REGL({
          canvas: canvasRef.current,
          attributes: {
            alpha: true,
            antialias: true,
            depth: true,
            stencil: true
          }
        });
      }

      const regl = reglRef.current;

      const positions: number[] = [];
      const sides: number[] = [];
      const volumes: number[] = [];

      const barWidth = 0.2;
      const barSpacing = barWidth * 0.1;

      processedData.forEach((bar) => {
        const xStart = 0;
        const volumeWidth = bar.normalizedVolume * barWidth * 2;

        // Altura de barra basada en el lado (ask/bid)
        // Asks crecen hacia arriba, bids hacia abajo desde el punto central
        const direction = bar.side === 'ask' ? 1 : -1;
        const barHeight = direction * (bar.price * 0.0001);

        positions.push(
          xStart, bar.price,
          xStart + volumeWidth, bar.price,
          xStart, bar.price + barHeight,
          xStart + volumeWidth, bar.price + barHeight
        );

        const sideValue = bar.side === 'ask' ? 1 : 0;
        for (let i = 0; i < 4; i++) {
          sides.push(sideValue);
          volumes.push(bar.normalizedVolume);
        }
      });

      const drawBars = regl({
        vert: vertexShader,
        frag: fragmentShader,
        attributes: {
          position: positions,
          side: sides,
          volume: volumes
        },
        uniforms: {
          aspectRatio: width / height,
          scale: [3.0, 1.0],
          translate: [0.95, 0],
          yScale: height,
          yOffset: 0,
          viewportHeight: height,
          minY: priceCoordinates.minY,
          maxY: priceCoordinates.maxY,
          priceMin: visiblePriceRange.min,
          priceMax: visiblePriceRange.max,
          bidColor: [0.149, 0.65, 0.604],
          askColor: [0.937, 0.325, 0.314],
          opacity: 0.8
        },
        count: positions.length / 2,
        primitive: 'triangle strip',
        blend: {
          enable: true,
          func: {
            srcRGB: 'src alpha',
            srcAlpha: 1,
            dstRGB: 'one minus src alpha',
            dstAlpha: 1
          }
        },
        depth: {
          enable: true,
          mask: true,
          func: 'less'
        }
      });

      regl.frame(() => {
        regl.clear({
          color: [0, 0, 0, 0],
          depth: 1
        });

        drawBars();
      });

      return () => {
        if (reglRef.current) {
          reglRef.current.destroy();
          reglRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error in WebGL rendering:', error);
    }
  }, [processedData, width, height, visiblePriceRange, priceCoordinates]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: `${width}px`,
        height: '100%',
        background: 'transparent',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 2
      }}
    >
      <canvas
        ref={canvasRef}
        width={width * (window.devicePixelRatio || 1)}
        height={height * (window.devicePixelRatio || 1)}
        style={{
          width: `${width}px`,
          height: `${height}px`
        }}
      />
    </div>
  );
};