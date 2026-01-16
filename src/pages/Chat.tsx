import { Layout } from '../layouts';

export const Chat = () => {
  return (
    <Layout title="AI Command Center" extraHead={<link rel="stylesheet" href="/static/chat.css" />}>
      <div class="app-layout">
        {/* Left Sidebar: Threads */}
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">
              <span>💬</span> Threads
            </span>
            <button
              id="new-chat-btn"
              class="btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            >
              + New
            </button>
          </div>
          <div id="thread-list" class="panel-content">
            <div
              style={{
                textAlign: 'center',
                color: 'var(--text-muted)',
                marginTop: '2rem',
                fontSize: '0.8rem',
              }}
            >
              Loading threads...
            </div>
          </div>
        </div>

        {/* Center: Main Stage */}
        <div class="main-stage">
          <div class="stage-header">
            <div class="brand-badge">
              <span style={{ fontSize: '1.25rem' }}>⚡</span>
              <span>AGENT COMMAND CENTER</span>
            </div>
            <div id="connection-status" class="status-indicator off">
              <span class="dot"></span>
              <span class="status-text">Disconnected</span>
            </div>
          </div>

          <div class="stage-content">
            {/* Input Section */}
            <div id="input-section" class="input-card">
              <div class="email-selector">
                <div class="email-option selected" data-email-id="billing">
                  <div class="email-meta">
                    <span style={{ fontWeight: 600, color: 'var(--accent)' }}>Billing Support</span>
                    <span
                      style={{ color: 'var(--danger)', fontSize: '0.7rem', fontWeight: 'bold' }}
                    >
                      URGENT
                    </span>
                  </div>
                  <div class="email-preview">
                    "I was charged twice for my subscription! Please help immediately."
                  </div>
                </div>
                <div class="email-option" data-email-id="custom">
                  <div class="email-meta">
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Custom Input</span>
                    <span>✏️</span>
                  </div>
                  <div class="email-preview" style={{ color: 'var(--text-secondary)' }}>
                    Write your own email scenario...
                  </div>
                </div>
              </div>

              <div id="custom-input-container" style={{ display: 'none', marginBottom: '1rem' }}>
                <textarea
                  id="custom-input"
                  class="custom-textarea"
                  placeholder="Paste email content here..."
                  rows={3}
                ></textarea>
              </div>

              <button id="start-btn" class="btn-primary">
                INITIALIZE AGENT SEQUENCE 🚀
              </button>
            </div>

            {/* Terminal Window */}
            <div class="terminal-window" id="log-panel">
              <div class="terminal-header">
                <div class="terminal-title">
                  <span>🖥️</span> SYSTEM LOGS
                </div>
                <span
                  id="log-count"
                  class="status-indicator"
                  style={{ padding: '2px 8px', fontSize: '0.65rem' }}
                >
                  IDLE
                </span>
              </div>
              <div id="log-list" class="terminal-content">
                <div style={{ color: 'var(--text-muted)', paddingTop: '1rem' }}>
                  &gt; System ready. Waiting for input...
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Timeline */}
        <div class="panel panel-right">
          <div class="panel-header">
            <span class="panel-title">
              <span>⏱️</span> Time Travel
            </span>
            <span id="checkpoint-count" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              0 steps
            </span>
          </div>
          <div id="history-list" class="panel-content timeline">
            <div
              style={{
                textAlign: 'center',
                color: 'var(--text-muted)',
                marginTop: '2rem',
                fontSize: '0.8rem',
              }}
            >
              History empty
            </div>
          </div>
        </div>
      </div>

      {/* State Preview Modal */}
      <div id="state-modal" class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <span class="panel-title">System State Snapshot</span>
            <button class="btn-secondary" onclick="closeModal()">
              ✕
            </button>
          </div>
          <div class="modal-code" id="state-json"></div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="closeModal()">
              Cancel
            </button>
            <button id="resume-btn" class="btn-primary" style={{ width: 'auto' }}>
              Rewind to Checkpoint ↺
            </button>
          </div>
        </div>
      </div>

      <script src="/static/chat.js"></script>
    </Layout>
  );
};
