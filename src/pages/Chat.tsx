import { html } from 'hono/html';
import { Layout } from '../layouts';

const styles = `
  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .header {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .header h1 {
    font-size: 1.75rem;
    color: #1e293b;
    margin-bottom: 0.5rem;
  }
  
  .header p {
    color: #64748b;
  }
  
  .main-content {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 1.5rem;
  }
  
  /* Email Cards Container */
  .email-cards-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .email-cards-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 0.5rem;
  }
  
  /* Email Card */
  .email-card {
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .email-card:hover {
    border-color: #94a3b8;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  .email-card.selected {
    border-color: #3b82f6;
    background: #f0f7ff;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }
  
  .email-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .email-from {
    font-weight: 600;
    color: #1e293b;
    font-size: 0.875rem;
  }
  
  .email-badge {
    padding: 0.2rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.7rem;
    font-weight: 500;
  }
  
  .email-badge.urgent {
    background: #fef2f2;
    color: #dc2626;
  }
  
  .email-badge.normal {
    background: #f0fdf4;
    color: #16a34a;
  }
  
  .email-badge.low {
    background: #eff6ff;
    color: #2563eb;
  }
  
  .email-badge.custom {
    background: #f5f3ff;
    color: #7c3aed;
  }
  
  /* Custom Input Form */
  .custom-input-card {
    background: white;
    border: 2px dashed #cbd5e1;
    border-radius: 12px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .custom-input-card:hover {
    border-color: #94a3b8;
  }
  
  .custom-input-card.selected {
    border-style: solid;
    border-color: #7c3aed;
    background: #faf5ff;
  }
  
  .custom-input-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: #475569;
    margin-bottom: 0.75rem;
  }
  
  .custom-input-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .input-group label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #64748b;
  }
  
  .input-group input,
  .input-group textarea {
    padding: 0.5rem 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.875rem;
    font-family: inherit;
    transition: all 0.2s;
  }
  
  .input-group input:focus,
  .input-group textarea:focus {
    outline: none;
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }
  
  .input-group textarea {
    min-height: 80px;
    resize: vertical;
  }
  
  .email-content {
    color: #475569;
    line-height: 1.5;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }
  
  .start-btn {
    width: 100%;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    padding: 0.75rem;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .start-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }
  
  .start-btn:disabled {
    background: #94a3b8;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  .connection-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    margin-bottom: 1rem;
    border-radius: 6px;
    font-size: 0.8rem;
  }
  
  .connection-status.connected {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
  }
  
  .connection-status.disconnected {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
  
  .connection-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
  
  /* Process Log Panel */
  .log-panel {
    background: #0f172a;
    border-radius: 12px;
    padding: 1.25rem;
    color: #e2e8f0;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.8rem;
    max-height: 600px;
    overflow-y: auto;
  }
  
  .log-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #94a3b8;
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-family: system-ui, sans-serif;
  }
  
  .log-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .log-entry {
    padding: 0.75rem;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.03);
    border-left: 3px solid #475569;
  }
  
  .log-entry.active {
    border-left-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }
  
  .log-entry.completed {
    border-left-color: #10b981;
  }
  
  .log-entry.error {
    border-left-color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }
  
  .log-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .log-icon {
    font-size: 1rem;
  }
  
  .log-node-name {
    font-weight: 600;
    color: #f1f5f9;
  }
  
  .log-time {
    margin-left: auto;
    color: #64748b;
    font-size: 0.7rem;
  }
  
  .log-details {
    color: #94a3b8;
    font-size: 0.75rem;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }
  
  .log-json {
    background: rgba(0,0,0,0.3);
    padding: 0.5rem;
    border-radius: 4px;
    margin-top: 0.5rem;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
  
  .log-output {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: rgba(16, 185, 129, 0.1);
    border-radius: 4px;
    color: #10b981;
  }
  
  .spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid #3b82f6;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .empty-log {
    color: #64748b;
    text-align: center;
    padding: 2rem;
  }
  
  .review-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
  }
  
  .approve-btn, .reject-btn {
    flex: 1;
    padding: 0.625rem;
    border: none;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .approve-btn {
    background: #10b981;
    color: white;
  }
  
  .approve-btn:hover {
    background: #059669;
  }
  
  .reject-btn {
    background: #ef4444;
    color: white;
  }
  
  .reject-btn:hover {
    background: #dc2626;
  }
  
  .approve-btn:disabled, .reject-btn:disabled {
    background: #64748b;
    cursor: not-allowed;
  }
`;

export const Chat = () => {
  return (
    <Layout title="Email Agent Demo">
      <style>{styles}</style>

      <div class="container">
        <div class="header">
          <h1>📧 Email Agent Demo</h1>
          <p>点击发送模拟邮件，查看 AI Agent 处理流程</p>
        </div>

        <div class="main-content">
          <div>
            <div id="connection-status" class="connection-status disconnected">
              <span class="connection-dot"></span>
              <span>未连接</span>
            </div>

            <div class="email-cards-title">📬 选择邮件或自定义输入：</div>
            <div class="email-cards-container">
              <div class="email-card selected" data-email-id="billing">
                <div class="email-header">
                  <span class="email-from">From: customer@example.com</span>
                  <span class="email-badge urgent">示例</span>
                </div>
                <div class="email-content">
                  I was charged twice for my subscription! This is urgent! Please help me resolve
                  this billing issue immediately.
                </div>
              </div>

              <div class="custom-input-card" data-email-id="custom">
                <div class="custom-input-title">✏️ 自定义邮件内容</div>
                <div class="custom-input-form">
                  <div class="input-group">
                    <label for="custom-sender">发件人邮箱</label>
                    <input
                      type="email"
                      id="custom-sender"
                      placeholder="example@email.com"
                      value="test@mycompany.com"
                    />
                  </div>
                  <div class="input-group">
                    <label for="custom-content">邮件内容</label>
                    <textarea id="custom-content" placeholder="输入邮件内容...">
                      Hello, I have a question about your pricing plans. Can you explain the
                      difference between the basic and premium tiers?
                    </textarea>
                  </div>
                </div>
              </div>
            </div>

            <button id="start-btn" class="start-btn" style="margin-top: 1rem;">
              🚀 发送邮件给 AI Agent
            </button>
          </div>

          <div class="log-panel">
            <div class="log-title">📋 处理日志</div>
            <div id="log-list" class="log-list">
              <div class="empty-log">点击发送按钮开始...</div>
            </div>
          </div>
        </div>
      </div>

      {html`
        <script>
          const startBtn = document.getElementById('start-btn');
          const connectionStatus = document.getElementById('connection-status');
          const logList = document.getElementById('log-list');
          const emailCards = document.querySelectorAll('.email-card, .custom-input-card');
          const customSenderInput = document.getElementById('custom-sender');
          const customContentInput = document.getElementById('custom-content');

          let ws = null;
          let selectedEmail = {
            id: 'billing',
            content:
              'I was charged twice for my subscription! This is urgent! Please help me resolve this billing issue immediately.',
            sender: 'customer@example.com',
          };
          let isCustomMode = false;

          const emailData = {
            billing: {
              content:
                'I was charged twice for my subscription! This is urgent! Please help me resolve this billing issue immediately.',
              sender: 'customer@example.com',
            },
          };

          // Email card selection
          emailCards.forEach((card) => {
            card.addEventListener('click', () => {
              emailCards.forEach((c) => c.classList.remove('selected'));
              card.classList.add('selected');
              const emailId = card.dataset.emailId;

              if (emailId === 'custom') {
                isCustomMode = true;
                // Use current input values
                selectedEmail = {
                  id: 'custom',
                  content: customContentInput.value,
                  sender: customSenderInput.value,
                };
              } else {
                isCustomMode = false;
                selectedEmail = {
                  id: emailId,
                  content: emailData[emailId].content,
                  sender: emailData[emailId].sender,
                };
              }
            });
          });

          // Update custom email data when inputs change
          customSenderInput.addEventListener('input', () => {
            if (isCustomMode) {
              selectedEmail.sender = customSenderInput.value;
            }
          });

          customContentInput.addEventListener('input', () => {
            if (isCustomMode) {
              selectedEmail.content = customContentInput.value;
            }
          });

          const nodeNames = {
            readEmail: '📨 读取邮件',
            classifyIntent: '🔍 意图分类',
            searchDocumentation: '📚 搜索文档',
            bugTracking: '🐛 Bug追踪',
            draftResponse: '✍️ 生成回复',
            humanReview: '👤 人工审核',
            sendReply: '📤 发送回复',
          };

          function updateConnection(connected) {
            connectionStatus.className =
              'connection-status ' + (connected ? 'connected' : 'disconnected');
            connectionStatus.innerHTML =
              '<span class="connection-dot"></span><span>' +
              (connected ? '已连接' : '未连接') +
              '</span>';
          }

          function clearLogs() {
            logList.innerHTML = '';
          }

          function addLogEntry(nodeName, status, details, output) {
            const time = new Date().toLocaleTimeString('zh-CN');
            const displayName = nodeNames[nodeName] || nodeName;

            let icon = '⏳';
            if (status === 'active') icon = '<span class="spinner"></span>';
            else if (status === 'completed') icon = '✅';
            else if (status === 'error') icon = '❌';

            const entry = document.createElement('div');
            entry.className = 'log-entry ' + status;
            entry.id = 'log-' + nodeName;

            let html =
              '<div class="log-header">' +
              '<span class="log-icon">' +
              icon +
              '</span>' +
              '<span class="log-node-name">' +
              displayName +
              '</span>' +
              '<span class="log-time">' +
              time +
              '</span>' +
              '</div>';

            if (details) {
              html += '<div class="log-details">' + details + '</div>';
            }

            if (output) {
              const outputStr =
                typeof output === 'object' ? JSON.stringify(output, null, 2) : output;
              html += '<div class="log-json">' + outputStr + '</div>';
            }

            entry.innerHTML = html;

            // Update existing or add new
            const existing = document.getElementById('log-' + nodeName);
            if (existing) {
              existing.replaceWith(entry);
            } else {
              logList.appendChild(entry);
            }

            // Scroll to bottom
            logList.parentElement.scrollTop = logList.parentElement.scrollHeight;
          }

          function updateLogEntry(nodeName, status, additionalOutput) {
            const entry = document.getElementById('log-' + nodeName);
            if (entry) {
              entry.className = 'log-entry ' + status;
              const iconSpan = entry.querySelector('.log-icon');
              if (iconSpan) {
                if (status === 'completed') iconSpan.innerHTML = '✅';
                else if (status === 'error') iconSpan.innerHTML = '❌';
              }

              if (additionalOutput) {
                const outputDiv = document.createElement('div');
                outputDiv.className = 'log-output';
                outputDiv.textContent = additionalOutput;
                entry.appendChild(outputDiv);
              }
            }
          }

          function connectWS() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(protocol + '//' + window.location.host + '/ws-chat');

            ws.onopen = () => updateConnection(true);
            ws.onclose = (event) => {
              console.log('WS Closed:', event.code, event.reason);
              updateConnection(false);
              setTimeout(connectWS, 3000);
            };

            ws.onmessage = (e) => {
              const data = JSON.parse(e.data);
              console.log('Received:', data);

              if (data.type === 'agent_started') {
                addLogEntry('started', 'active', 'Agent 开始处理邮件...', data.initialState);
                setTimeout(() => updateLogEntry('started', 'completed'), 300);
              } else if (data.type === 'node_update') {
                // Get thinking content from AI
                let thinking = '';
                if (data.output && data.output.thinking) {
                  thinking = data.output.thinking;
                }

                // Add entry with thinking content
                addLogEntry(data.node, 'active', thinking || '处理完成', null);

                // Then update to completed with output summary
                setTimeout(() => {
                  let outputSummary = null;
                  if (data.output) {
                    if (data.output.classification) {
                      outputSummary =
                        '✅ 分类: ' +
                        data.output.classification.intent +
                        ' | 紧急度: ' +
                        data.output.classification.urgency;
                    }
                    if (data.output.searchResults) {
                      outputSummary = '✅ 找到 ' + data.output.searchResults.length + ' 条文档';
                    }
                    if (data.output.responseText) {
                      outputSummary =
                        '✅ 回复已生成 (' + data.output.responseText.length + ' 字符)';
                    }
                  }
                  updateLogEntry(data.node, 'completed', outputSummary);
                }, 800);
              } else if (data.type === 'agent_interrupted') {
                // Show interrupt waiting state with action buttons
                const interruptInfo =
                  data.interruptData && data.interruptData[0] ? data.interruptData[0].value : {};

                let waitingMsg = '⏸️ 等待人工审核\\n\\n';
                waitingMsg += '📧 邮件ID: ' + (interruptInfo.emailId || 'N/A') + '\\n';
                waitingMsg += '🔴 紧急程度: ' + (interruptInfo.urgency || 'N/A') + '\\n';
                waitingMsg += '📝 意图: ' + (interruptInfo.intent || 'N/A') + '\\n\\n';
                waitingMsg += '草稿回复:\\n' + (interruptInfo.draftResponse || 'N/A');

                // Create entry with action buttons
                const entry = document.createElement('div');
                entry.className = 'log-entry active';
                entry.id = 'log-humanReview';
                entry.innerHTML =
                  \`
                            <div class="log-header">
                              <span class="log-icon"><span class="spinner"></span></span>
                              <span class="log-node-name">👤 人工审核</span>
                              <span class="log-time">\` +
                  new Date().toLocaleTimeString('zh-CN') +
                  \`</span>
                            </div>
                            <div class="log-details">\` +
                  waitingMsg +
                  \`</div>
                            <div class="review-actions">
                              <button class="approve-btn" id="approve-btn">✅ 批准发送</button>
                              <button class="reject-btn" id="reject-btn">❌ 拒绝</button>
                            </div>
                          \`;
                logList.appendChild(entry);
                logList.parentElement.scrollTop = logList.parentElement.scrollHeight;

                // Add button handlers
                document.getElementById('approve-btn').onclick = () => {
                  if (!ws || ws.readyState !== WebSocket.OPEN) return;
                  document.getElementById('approve-btn').disabled = true;
                  document.getElementById('reject-btn').disabled = true;
                  ws.send(JSON.stringify({ type: 'resume_agent', approved: true }));
                };

                document.getElementById('reject-btn').onclick = () => {
                  if (!ws || ws.readyState !== WebSocket.OPEN) return;
                  document.getElementById('approve-btn').disabled = true;
                  document.getElementById('reject-btn').disabled = true;
                  ws.send(JSON.stringify({ type: 'resume_agent', approved: false }));
                };

                startBtn.disabled = false;
                startBtn.textContent = '🚀 发送邮件给 AI Agent';
              } else if (data.type === 'agent_complete') {
                addLogEntry('complete', 'completed', '✨ Agent 处理完成!', null);
                startBtn.disabled = false;
                startBtn.textContent = '🚀 发送邮件给 AI Agent';
              } else if (data.type === 'error') {
                addLogEntry('error', 'error', data.message, null);
                startBtn.disabled = false;
                startBtn.textContent = '🚀 发送邮件给 AI Agent';
              }
            };
          }

          connectWS();

          startBtn.addEventListener('click', () => {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;

            clearLogs();
            startBtn.disabled = true;
            startBtn.textContent = '处理中...';

            ws.send(
              JSON.stringify({
                type: 'start_agent',
                emailContent: selectedEmail.content,
                senderEmail: selectedEmail.sender,
                emailId: selectedEmail.id + '_' + Date.now(),
                threadId: 'thread_' + Date.now(),
              })
            );
          });
        </script>
      `}
    </Layout>
  );
};
