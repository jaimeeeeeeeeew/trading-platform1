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
  attribute vec2 basePosition;
  attribute float instancePrice;
  attribute float instanceVolume;
  attribute float instanceSide;

  uniform float viewportHeight;
  uniform float minY;
  uniform float maxY;
  uniform float priceMin;
  uniform float priceMax;
  uniform vec2 scale;
  uniform vec2 translate;
  uniform float maxVolume;

  varying float vSide;
  varying float vVolume;

  void main() {
    vSide = instanceSide;
    vVolume = instanceVolume;

    // Ajustar el ancho de las barras según el volumen normalizado
    vec2 position = basePosition;
    float normalizedWidth = (instanceVolume / maxVolume) * 0.8; // Reducir el factor a 0.8 para barras más delgadas
    position.x *= normalizedWidth;

    float normalizedPrice = (instancePrice - priceMin) / (priceMax - priceMin);
    float screenY = minY + (normalizedPrice * (maxY - minY));
    float y = ((viewportHeight - screenY) / viewportHeight) * 2.0 - 1.0;

    float x = position.x * scale.x + translate.x;

    gl_Position = vec4(x, y + position.y * scale.y, 0, 1);
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
    float dynamicOpacity = min(vVolume + 0.3, 0.85); // Aumentar opacidad mínima pero mantener un máximo
    gl_FragColor = vec4(color, dynamicOpacity);
  }
`;

export const VolumeProfileGL = ({
  data,
  width,
  height,
  visiblePriceRange,
  priceCoordinates,
  grouping
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reglRef = useRef<Regl | null>(null);

  const processedData = useMemo(() => {
    if (!data || data.length === 0 || !priceCoordinates) return null;

    const groupSize = parseInt(grouping);
    const groupedData = new Map();

    // Filtrar datos dentro del rango visible
    const visibleData = data.filter(d => 
      d.price >= visiblePriceRange.min && 
      d.price <= visiblePriceRange.max
    );

    // Agrupar datos
    visibleData.forEach(item => {
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

    // Encontrar el volumen máximo dentro del rango visible
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
      const maxVolume = Math.max(...processedData.map(d => d.volume));

      // Geometría base para una barra rectangular
      const basePositions = [
        -0.5, -0.05,  // Inferior izquierda
        0.5, -0.05,   // Inferior derecha
        -0.5, 0.05,   // Superior izquierda
        -0.5, 0.05,   // Superior izquierda
        0.5, -0.05,   // Inferior derecha
        0.5, 0.05     // Superior derecha
      ];

      const instanceData = processedData.map(d => ({
        price: d.price,
        volume: d.normalizedVolume,
        side: d.side === 'ask' ? 1 : 0
      }));

      const drawBars = regl({
        vert: vertexShader,
        frag: fragmentShader,

        attributes: {
          basePosition: basePositions,
          instancePrice: {
            buffer: instanceData.map(d => d.price),
            divisor: 1
          },
          instanceVolume: {
            buffer: instanceData.map(d => d.volume),
            divisor: 1
          },
          instanceSide: {
            buffer: instanceData.map(d => d.side),
            divisor: 1
          }
        },

        uniforms: {
          scale: [2.0, 1.0],        // Escala ajustada para barras más visibles
          translate: [-0.7, 0],     // Ajuste de posición
          viewportHeight: height,
          minY: priceCoordinates.minY,
          maxY: priceCoordinates.maxY,
          priceMin: visiblePriceRange.min,
          priceMax: visiblePriceRange.max,
          maxVolume: maxVolume,
          bidColor: [0.149, 0.65, 0.604],  // Color verde para compras
          askColor: [0.937, 0.325, 0.314], // Color rojo para ventas
          opacity: 0.85                     // Opacidad base
        },

        count: 6,
        instances: instanceData.length,

        depth: {
          enable: true,
          mask: true,
          func: 'less'
        },

        blend: {
          enable: true,
          func: {
            srcRGB: 'src alpha',
            srcAlpha: 1,
            dstRGB: 'one minus src alpha',
            dstAlpha: 1
          }
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
        right: '32px',
        top: 0,
        width: `${width}px`,
        height: '100%',
        background: 'transparent',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
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