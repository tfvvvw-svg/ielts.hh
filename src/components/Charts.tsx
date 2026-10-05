/** Shared chart styling so every visual reads as part of one system. */
export const AXIS = { stroke: 'rgb(var(--muted))', fontSize: 11 } as const;
export const GRID = 'rgb(var(--border))';
export const COLORS = ['#3366f2', '#14b8a6', '#f59e0b', '#f43f5e'];

export function chartTooltip() {
  const border = getComputedStyle(document.documentElement).getPropertyValue('--border').trim();
  return {
    contentStyle: {
      borderRadius: 12,
      border: `1px solid ${border}`,
      background: 'rgb(var(--surface))',
      fontSize: 12,
      boxShadow: '0 12px 32px -16px rgba(0,0,0,.5)',
    },
  };
}

export function gradient(id: string, color: string) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={color} stopOpacity={0.35} />
        <stop offset="95%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

export const CHART_MARGIN = { top: 8, right: 8, left: -20, bottom: 0 } as const;