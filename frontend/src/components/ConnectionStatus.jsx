import './ConnectionStatus.css';

const LABEL = {
  open: 'Live',
  connecting: 'Connecting…',
  disconnected: 'Disconnected…',
};

const DOT_CLASS = {
  open: 'dot--open',
  connecting: 'dot--connecting',
  disconnected: 'dot--disconnected',
};

/**
 * The heartbeat trace is the page's signature element: a literal pulse
 * line whose blip is driven by real server ping frames (`pulse` count),
 * not a decorative loop. When disconnected, the line flatlines.
 */
export default function ConnectionStatus({ status, pulse }) {
  const isLive = status === 'open';

  return (
    <div className="conn-status" role="status" aria-live="polite">
      <div className="conn-status__trace">
        <svg viewBox="0 0 120 24" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            key={isLive ? pulse : 'flat'}
            className={isLive ? 'trace-line trace-line--beat' : 'trace-line trace-line--flat'}
            points="0,12 30,12 38,12 44,2 50,22 56,12 64,12 80,12 88,4 94,20 100,12 120,12"
          />
        </svg>
      </div>
      <div className="conn-status__label">
        <span className={`dot ${DOT_CLASS[status] || 'dot--disconnected'}`} />
        <span className="mono">{LABEL[status] || 'Disconnected…'}</span>
      </div>
    </div>
  );
}
