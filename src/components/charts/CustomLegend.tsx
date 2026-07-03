export function CustomLegend({ payload }: any) { if (!payload?.length) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '8px', flexWrap: 'wrap' }}>
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }} />
          <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 500 }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
