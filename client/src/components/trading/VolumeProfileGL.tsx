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

// Vertex shader modificado para instancing
const vertexShader = `
  precision mediump float;

  // Atributos base para la geometría de la barra
  attribute vec2 basePosition;

  // Atributos de la instancia
  attribute float instancePrice;
  attribute float instanceVolume;
  attribute float instanceSide;

  // Uniforms
  uniform float viewportHeight;
  uniform float minY;
  uniform float maxY;
  uniform float priceMin;
  uniform float priceMax;
  uniform vec2 scale;
  uniform vec2 translate;

  // Varying para el fragment shader
  varying float vSide;
  varying float vVolume;

  void main() {
    vSide = instanceSide;
    vVolume = instanceVolume;

    // Calcular la posición base de la barra
    vec2 position = basePosition;
    position.x *= instanceVolume; // Escalar el ancho según el volumen

    // Normalizar el precio al rango [0, 1]
    float normalizedPrice = (instancePrice - priceMin) / (priceMax - priceMin);

    // Mapear al rango de coordenadas de pantalla
    float screenY = minY + (normalizedPrice * (maxY - minY));

    // Convertir a coordenadas NDC
    float y = ((viewportHeight - screenY) / viewportHeight) * 2.0 - 1.0;

    // Aplicar escala y traslación
    float x = -position.x * scale.x + translate.x;

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

  // Procesar datos para el instanced rendering
  const processedData = useMemo(() => {
    if (!data || data.length === 0 || !priceCoordinates) return null;

    const groupSize = parseInt(grouping);

    // Filtrar y agrupar datos
    const groupedData = new Map();
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

    // Convertir a array y normalizar
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
      // Inicializar WebGL si es necesario
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

      // Geometría base para una barra (un rectángulo simple)
      const basePositions = [
        // Primera barra (rectángulo usando 2 triángulos)
        -0.5, -0.02, // Inferior izquierda
        0.5, -0.02,  // Inferior derecha
        -0.5, 0.02,  // Superior izquierda
        -0.5, 0.02,  // Superior izquierda
        0.5, -0.02,  // Inferior derecha
        0.5, 0.02    // Superior derecha
      ];

      // Datos de instancia para cada barra
      const instanceData = processedData.map(d => ({
        price: d.price,
        volume: d.normalizedVolume,
        side: d.side === 'ask' ? 1 : 0
      }));

      // Comando de dibujo con instancing
      const drawBars = regl({
        vert: vertexShader,
        frag: fragmentShader,

        attributes: {
          // Geometría base de la barra
          basePosition: basePositions,

          // Datos de instancia
          instancePrice: {
            buffer: instanceData.map(d => d.price),
            divisor: 1 // Una vez por instancia
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
          scale: [3.0, 1.0],
          translate: [0.95, 0],
          viewportHeight: height,
          minY: priceCoordinates.minY,
          maxY: priceCoordinates.maxY,
          priceMin: visiblePriceRange.min,
          priceMax: visiblePriceRange.max,
          bidColor: [0.149, 0.65, 0.604],
          askColor: [0.937, 0.325, 0.314],
          opacity: 0.8
        },

        count: 6, // Vértices en la geometría base
        instances: instanceData.length, // Número de barras a dibujar

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

      // Loop de renderizado
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
        right: '65px',
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