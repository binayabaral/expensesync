import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'XpenseSync — Your finances, finally in control';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Background gradient blobs */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            left: -100,
            width: 700,
            height: 700,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 65%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -200,
            right: 300,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 65%)',
          }}
        />

        {/* Left content area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '64px 72px',
            flex: 1,
            zIndex: 1,
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 13,
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(34,197,94,0.4)',
              }}
            >
              <svg width='26' height='26' viewBox='0 0 24 24' fill='none'>
                <path d='M3 3v18h18' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' />
                <path d='M7 16l4-4 4 4 4-6' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' />
              </svg>
            </div>
            <span
              style={{
                color: 'white',
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: '-0.3px',
              }}
            >
              XpenseSync
            </span>
          </div>

          {/* Headline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span
              style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: 68,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: '-2px',
              }}
            >
              Your finances,
            </span>
            <span
              style={{
                fontSize: 68,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: '-2px',
                background: 'linear-gradient(90deg, #22c55e, #4ade80)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              finally in sync.
            </span>
            <div
              style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: 21,
                marginTop: '20px',
                lineHeight: 1.55,
                maxWidth: 560,
              }}
            >
              Track expenses · Split bills · Manage subscriptions · Grow net worth
            </div>
          </div>

          {/* Bottom row: badges + URL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['Free', 'PWA', 'Privacy-first'].map(tag => (
                <div
                  key={tag}
                  style={{
                    background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.25)',
                    borderRadius: 100,
                    padding: '7px 18px',
                    color: '#4ade80',
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 17 }}>
              xpensesync.com
            </span>
          </div>
        </div>

        {/* Right panel — mock dashboard card */}
        <div
          style={{
            width: 340,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px',
            padding: '48px 40px 48px 0',
            zIndex: 1,
          }}
        >
          {/* Net worth card */}
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '28px 32px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 500, letterSpacing: '0.5px' }}>
              NET WORTH
            </span>
            <span style={{ color: 'white', fontSize: 34, fontWeight: 700, letterSpacing: '-1px' }}>
              NPR 4,82,500
            </span>
            <span style={{ color: '#22c55e', fontSize: 14, fontWeight: 500 }}>
              ↑ 12.4% this month
            </span>
            {/* Mini bar chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginTop: '12px', height: '44px' }}>
              {[28, 38, 32, 50, 42, 60, 55, 70].map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    borderRadius: 4,
                    background: i === 7 ? '#22c55e' : 'rgba(34,197,94,0.25)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Recent expense rows */}
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '20px 24px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {[
              { label: 'Groceries', amt: '−2,400', color: '#f87171' },
              { label: 'Salary', amt: '+85,000', color: '#4ade80' },
              { label: 'Rent', amt: '−18,000', color: '#f87171' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15 }}>{row.label}</span>
                <span style={{ color: row.color, fontSize: 15, fontWeight: 600 }}>{row.amt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
