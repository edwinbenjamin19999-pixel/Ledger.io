interface ChartTooltipProps { active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: number, name: string) => string;
}

export function ChartTooltip({ active, payload, label, formatter }: ChartTooltipProps) { if (!active || !payload?.length) return null;

  return (
    <div
      style={{ background: 'rgba(255,255,255,0.97)',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '12px 16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        backdropFilter: 'blur(8px)',
        minWidth: '160px',
      }}
    >
      <p style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px',
      }}>
        {label}
      </p>
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%',
            background: entry.color, flexShrink: 0,
          }} />
          <span style={{ color: '#475569', fontSize: '12px' }}>{entry.name}</span>
          <span style={{ color: '#0f172a', fontSize: '12px', fontWeight: 700,
            marginLeft: 'auto', paddingLeft: '16px', fontVariantNumeric: 'tabular-nums',
          }}>
            {formatter
              ? formatter(entry.value, entry.name)
              : new Intl.NumberFormat('sv-SE').format(Math.abs(entry.value)) + ' kr'}
          </span>
        </div>
      ))}
    </div>
  );
}
