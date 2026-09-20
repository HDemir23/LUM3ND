const COLS = 12;
const ROWS = 7;
const TOTAL = 15;

function tileSrc(col: number, row: number) {
  const n = ((col + row * 4) % TOTAL) + 1;
  return `/tiles/tile-${String(n).padStart(2, "0")}.png`;
}

export default function Mosaic() {
  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const i = row * COLS + col;
      cells.push(
        <div
          className="mosaic-cell"
          key={`${row}-${col}`}
          style={{ animationDelay: `${((col * 47 + row * 31) % 720) / 1000}s` }}
        >
          <div className="mosaic-tile">
            <img
              src={tileSrc(col, row)}
              alt=""
              width={200}
              height={200}
              draggable={false}
              loading={i < 8 ? "eager" : "lazy"}
              decoding="async"
            />
          </div>
        </div>,
      );
    }
  }
  return (
    <div className="mosaic" aria-hidden="true">
      <div className="mosaic-grid">{cells}</div>
      <div className="mosaic-veil" />
      <div className="mosaic-scrim" />
    </div>
  );
}

export function ScenePhoto({ src }: { src: string }) {
  return (
    <div className="scene-photo" aria-hidden="true">
      <img src={src} alt="" decoding="async" />
      <div className="scene-veil" />
    </div>
  );
}
