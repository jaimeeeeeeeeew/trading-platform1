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

// Vertex shader modificado para barras rectangulares
const vertexShader = `
  precision mediump float;

  // Atributos base para la geometría de la barra
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

  varying float vSide;
  varying float vVolume;

  void main() {
    vSide = instanceSide;
    vVolume = instanceVolume;

    // Ajustar el tamaño base de la barra
    vec2 position = basePosition;
    position.x *= (instanceVolume * 1.2); // Factor de ancho para las barras

    float normalizedPrice = (instancePrice - priceMin) / (priceMax - priceMin);
    float screenY = minY + (normalizedPrice * (maxY - minY));
    float y = ((viewportHeight - screenY) / viewportHeight) * 2.0 - 1.0;

    // Ajustar la posición X para las barras
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
    // Aumentar la opacidad mínima para mejor visibilidad
    float alpha = max(opacity * vVolume, 0.4);
    gl_FragColor = vec4(color, alpha);
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

    // Filtrar y agrupar datos
    data
      .filter(d => d.price >= visiblePriceRange.min && d.price <= visiblePriceRange.max)
      .forEach(item => {
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

    console.log('Datos procesados:', {
      totalBars: result.length,
      maxVolume,
      sampleBar: result[0],
      priceRange: visiblePriceRange
    });

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

      console.log('Instance data:', {
        numInstances: instanceData.length,
        firstInstance: instanceData[0],
        lastInstance: instanceData[instanceData.length - 1]
      });

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
          scale: [3.0, 1.0],        // Escala ajustada para barras
          translate: [-0.5, 0],     // Centrado ajustado
          viewportHeight: height,
          minY: priceCoordinates.minY,
          maxY: priceCoordinates.maxY,
          priceMin: visiblePriceRange.min,
          priceMax: visiblePriceRange.max,
          bidColor: [0.149, 0.65, 0.604],  // Color verde para compras
          askColor: [0.937, 0.325, 0.314], // Color rojo para ventas
          opacity: 0.85                     // Opacidad ajustada
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