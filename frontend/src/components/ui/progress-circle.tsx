/**
 * Progress circle, per the design system frame.
 *
 * Two shapes — a full ring and a half-circle gauge — each in five sizes, with
 * an optional label above the percentage. The arc is a stroked SVG circle or
 * path with a round cap, drawn clockwise from the top (full) or from the left
 * over the top (half).
 *
 * The value is announced once, on the wrapper, as a progressbar; the SVG and
 * the printed percentage are both hidden from assistive tech so a screen
 * reader does not read the number three times.
 */

import { cn } from "@/components/ui/primitives";

export type ProgressSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

/**
 * Which surface the ring sits on.
 *
 * "brand" is the default: a brand arc on a light card. "panel" is the ring
 * on the dark petrol panel, where the track is a deeper shade of the panel
 * itself and the arc is white. It is a tone rather than a className because
 * three things have to change together — track, arc and readout — and
 * passing them separately is how one of them gets forgotten.
 */
export type ProgressTone = "brand" | "panel";

const TONES: Record<
  ProgressTone,
  { track: string; arc: string; value: string; label: string }
> = {
  brand: {
    track: "stroke-line",
    arc: "stroke-brand-700",
    value: "text-ink-strong",
    label: "text-ink-muted",
  },
  panel: {
    track: "stroke-panel-track",
    arc: "stroke-panel-ink",
    value: "text-panel-ink",
    label: "text-panel-ink-muted",
  },
};

type SizeSpec = {
  /** Outer diameter in px. */
  box: number;
  /** Stroke width in px. */
  stroke: number;
  /** Tailwind classes for the percentage and the label. */
  value: string;
  label: string;
  /**
   * Room below the diameter line on the half gauge, for the lower half of the
   * readout that sits centred on it.
   */
  footroom: number;
};

const SIZES: Record<ProgressSize, SizeSpec> = {
  xs: { box: 36, stroke: 4, value: "text-[10px]", label: "text-[8px]", footroom: 10 },
  sm: { box: 68, stroke: 6, value: "text-sm", label: "text-[10px]", footroom: 16 },
  md: { box: 88, stroke: 7, value: "text-base", label: "text-[10px]", footroom: 18 },
  lg: { box: 112, stroke: 8, value: "text-xl", label: "text-[11px]", footroom: 22 },
  xl: { box: 140, stroke: 10, value: "text-[26px]", label: "text-xs", footroom: 28 },
  // The profile wheel on the dashboard panel. Thicker in proportion than the
  // rest of the scale, because on the frame the ring is the panel's subject
  // rather than an indicator beside something else.
  "2xl": { box: 168, stroke: 15, value: "text-[34px]", label: "text-xs", footroom: 32 },
};

function clamp(value: number) {
  return Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 100);
}

function Readout({
  pct,
  label,
  spec,
  tone,
  className,
  style,
}: {
  pct: number;
  label?: string;
  spec: SizeSpec;
  tone: ProgressTone;
  className?: string;
  style?: React.CSSProperties;
}) {
  const colours = TONES[tone];
  return (
    <div aria-hidden style={style} className={cn("text-center leading-tight", className)}>
      {label ? (
        <span className={cn("block", colours.label, spec.label)}>{label}</span>
      ) : null}
      <span className={cn("block font-semibold", colours.value, spec.value)}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}

export function ProgressCircle({
  value,
  size = "md",
  label,
  shape = "full",
  tone = "brand",
  title,
  className,
}: {
  value: number;
  size?: ProgressSize;
  /** Small caption above the percentage, e.g. "Active users". */
  label?: string;
  shape?: "full" | "half";
  /** Which surface the ring sits on — see ProgressTone. */
  tone?: ProgressTone;
  /** Accessible name. Defaults to the label, else a generic one. */
  title?: string;
  className?: string;
}) {
  const pct = clamp(value);
  const spec = SIZES[size];
  const colours = TONES[tone];
  const { box, stroke } = spec;

  // Inset by half the stroke so the arc and its round caps stay in the box.
  const r = (box - stroke) / 2;
  const cx = box / 2;
  const cy = box / 2;

  const name = title ?? label ?? "Progress";
  const common = {
    fill: "none" as const,
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
  };

  if (shape === "half") {
    // Semicircle from the left, over the top, to the right.
    const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
    const length = Math.PI * r;
    const svgHeight = cy + stroke / 2;

    return (
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={name}
        className={cn("relative shrink-0", className)}
        style={{ width: box, height: svgHeight + spec.footroom }}
      >
        <svg width={box} height={svgHeight} viewBox={`0 0 ${box} ${svgHeight}`}>
          <path {...common} d={d} className={colours.track} />
          <path
            {...common}
            d={d}
            className={cn(
              colours.arc,
              "transition-[stroke-dashoffset] duration-500",
            )}
            strokeDasharray={length}
            strokeDashoffset={length * (1 - pct / 100)}
          />
        </svg>

        {/* Centred on the diameter line, half in the arc's hollow. */}
        <Readout
          pct={pct}
          label={label}
          spec={spec}
          tone={tone}
          className="absolute inset-x-0 -translate-y-1/2"
          style={{ top: cy }}
        />
      </div>
    );
  }

  const circumference = 2 * Math.PI * r;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={name}
      className={cn("relative shrink-0", className)}
      style={{ width: box, height: box }}
    >
      {/* -90deg so the arc starts at twelve o'clock and runs clockwise. */}
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} className="-rotate-90">
        <circle {...common} cx={cx} cy={cy} r={r} className={colours.track} />
        <circle
          {...common}
          cx={cx}
          cy={cy}
          r={r}
          className={cn(
            colours.arc,
            "transition-[stroke-dashoffset] duration-500",
          )}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
        />
      </svg>

      <div className="absolute inset-0 grid place-items-center">
        <Readout pct={pct} label={label} spec={spec} tone={tone} />
      </div>
    </div>
  );
}
