import iconSprite from "@/assets/icons/icons-sprite.png";

type IconName = 
  | "editar" | "agregar" | "copiar" | "borrar" | "guardar" | "calcular" | "excel" | "calendario"
  | "administracion" | "bancos" | "cosecha" | "arrime" | "transferencia" | "cheques"
  | "reportes" | "herramientas" | "diagnostico" | "minimizar" | "respaldo" | "graficos"
  | "almacen" | "parametros";

const iconPositions: Record<IconName, { row: number; col: number }> = {
  editar: { row: 0, col: 0 },
  agregar: { row: 0, col: 1 },
  copiar: { row: 0, col: 2 },
  borrar: { row: 0, col: 3 },
  guardar: { row: 0, col: 4 },
  calcular: { row: 0, col: 5 },
  excel: { row: 0, col: 6 },
  calendario: { row: 0, col: 7 },
  administracion: { row: 1, col: 0 },
  bancos: { row: 1, col: 1 },
  cosecha: { row: 1, col: 2 },
  arrime: { row: 1, col: 3 },
  transferencia: { row: 1, col: 4 },
  cheques: { row: 1, col: 5 },
  reportes: { row: 2, col: 0 },
  herramientas: { row: 2, col: 1 },
  diagnostico: { row: 2, col: 2 },
  minimizar: { row: 2, col: 3 },
  respaldo: { row: 2, col: 4 },
  graficos: { row: 2, col: 5 },
  almacen: { row: 0, col: 4 },
  parametros: { row: 0, col: 0 },
};

const ICON_SIZE = 100;
const COLS = 8;
const ROWS = 3;
const SPRITE_WIDTH = 1024;
const SPRITE_HEIGHT = 432;
const COL_WIDTH = SPRITE_WIDTH / COLS;
const ROW_HEIGHT = SPRITE_HEIGHT / ROWS;

interface SpriteIconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export default function SpriteIcon({ name, size = 16, className = "" }: SpriteIconProps) {
  const pos = iconPositions[name];
  if (!pos) return null;

  const scale = size / ICON_SIZE;
  const bgX = pos.col * COL_WIDTH;
  const bgY = pos.row * ROW_HEIGHT;
  
  return (
    <span
      className={`inline-block overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: "block",
          width: ICON_SIZE,
          height: ICON_SIZE,
          backgroundImage: `url(${iconSprite})`,
          backgroundPosition: `-${bgX + 14}px -${bgY + 5}px`,
          backgroundSize: `${SPRITE_WIDTH}px ${SPRITE_HEIGHT}px`,
          backgroundRepeat: "no-repeat",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
    </span>
  );
}

export type { IconName };
