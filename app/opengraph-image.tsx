import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ExpenseSync — Your finances, finally in control';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0c0a09',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top-left green glow */}
        <div
          style={{
            position: 'absolute',
            top: -150,
            left: -150,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,197,94,0.22) 0%, transparent 70%)',
          }}
        />
        {/* Bottom-right glow */}
        <div
          style={{
            position: 'absolute',
            bottom: -120,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)',
          }}
        />

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '52px' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              background: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width='26' height='26' viewBox='0 0 24 24' fill='white'>
              <path d='M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z' />
            </svg>
          </div>
          <span style={{ color: 'white', fontSize: 34, fontWeight: 700, letterSpacing: '-0.5px' }}>
            ExpenseSync
          </span>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '28px' }}>
          <span style={{ color: 'white', fontSize: 74, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px' }}>
            Your finances,
          </span>
          <span style={{ color: '#22c55e', fontSize: 74, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px' }}>
            finally in control
          </span>
        </div>

        {/* Description */}
        <div
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 22,
            marginBottom: '52px',
            maxWidth: 720,
            lineHeight: 1.6,
          }}
        >
          Track expenses, split bills, manage subscriptions, and watch your net worth grow. Free, always.
        </div>

        {/* Feature badges */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {['Expense Tracking', 'Bill Splitting', 'Recurring Payments', 'Net Worth'].map(f => (
            <div
              key={f}
              style={{
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: 100,
                padding: '9px 22px',
                color: '#22c55e',
                fontSize: 17,
                fontWeight: 500,
              }}
            >
              {f}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
