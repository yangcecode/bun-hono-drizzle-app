/**
 * Chat Page Controller
 * "AI Command Center" Edition
 */

const AppState = {
  currentThreadId: null,
  ws: null,
  selectedMode: 'billing', // 'billing' | 'custom'
  emailData: {
    billing: {
      content: "I was charged twice for my subscription! This is urgent! Please help me resolve this billing issue immediately.",
      sender: "customer@example.com"
    },
    custom: {
      content: "",
      sender: "user@custom"
    }
  }
};

// =============================================================================
// Initialization
// =============================================================================

function init() {
  bindEventListeners();
  connectWebSocket();
  loadThreads();
}

function bindEventListeners() {
  document.getElementById("start-btn").addEventListener("click", startAgent);
  document.getElementById("new-chat-btn").addEventListener("click", createNewChat);
  
  // Email Selection Logic
  document.querySelectorAll('.email-option').forEach(el => {
    el.addEventListener('click', () => selectEmailMode(el));
  });

  // Expose global functions for inline handlers
  window.closeModal = closeModal;
  window.deleteThread = deleteThread;
  window.submitReview = submitReview;
}

function selectEmailMode(element) {
  // UI Update
  document.querySelectorAll('.email-option').forEach(el => el.classList.remove('selected'));
  element.classList.add('selected');
  
  // Logic Update
  const mode = element.dataset.emailId;
  AppState.selectedMode = mode;
  
  // Toggle Custom Input Visibility
  const customInputContainer = document.getElementById('custom-input-container');
  if (mode === 'custom') {
    customInputContainer.style.display = 'block';
    document.getElementById('custom-input').focus();
  } else {
    customInputContainer.style.display = 'none';
  }
}

// =============================================================================
// WebSocket
// =============================================================================

function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  AppState.ws = new WebSocket(`${protocol}//${window.location.host}/ws-chat`);

  AppState.ws.onopen = () => updateConnectionStatus(true);
  AppState.ws.onclose = () => {
    updateConnectionStatus(false);
    setTimeout(connectWebSocket, 3000);
  };
  AppState.ws.onmessage = (e) => handleWebSocketMessage(JSON.parse(e.data));
}

function updateConnectionStatus(connected) {
  const el = document.getElementById("connection-status");
  const text = el.querySelector(".status-text");
  
  if (connected) {
    el.className = "status-indicator on";
    text.textContent = "SYSTEM ONLINE";
  } else {
    el.className = "status-indicator off";
    text.textContent = "DISCONNECTED";
  }
}

function handleWebSocketMessage(data) {
  const handlers = {
    agent_started: () => addLogEntry("SYSTEM", "active", "Sequence initiated...", data),
    time_travel_started: () => addLogEntry("SYSTEM", "warning", `Rewinding timeline to ${data.checkpointId}...`),
    node_update: () => handleNodeUpdate(data),
    agent_interrupted: () => handleInterrupt(data),
    agent_complete: () => handleComplete(data),
    error: () => addLogEntry("ERROR", "error", data.message)
  };

  if (handlers[data.type]) handlers[data.type]();
}

// =============================================================================
// Core Logic
// =============================================================================

function startAgent() {
  if (!AppState.ws) return;

  const threadId = AppState.currentThreadId || `session_${Date.now().toString(36)}`;
  AppState.currentThreadId = threadId;

  // Determine Content
  let content = AppState.emailData.billing.content;
  if (AppState.selectedMode === 'custom') {
    content = document.getElementById('custom-input').value || "Hello";
  }

  clearLogs();
  setBusyState(true);

  AppState.ws.send(JSON.stringify({
    type: "start_agent",
    threadId: threadId,
    emailContent: content,
    senderEmail: AppState.selectedMode === 'billing' ? "customer@example.com" : "user@current",
    emailId: `msg_${Date.now()}`
  }));

  // Refresh threads list shortly after
  setTimeout(loadThreads, 1000);
}

function handleNodeUpdate(data) {
  const { node, output } = data;
  let text = output.thinking || "Processing node...";
  
  if (output.classification) {
    text = `Analyzed Intent: ${output.classification.intent} [${output.classification.urgency}]`;
  }
  
  addLogEntry(node.toUpperCase(), "completed", text, output);
  refreshHistory();
}

function handleComplete(data) {
  addLogEntry("COMPLETE", "success", "Agent sequence finished.");
  refreshHistory();
  setBusyState(false);
}

function handleInterrupt(data) {
  addLogEntry("INTERRUPT", "warning", "⏸️ Human Review Required", data.interruptData);
  
  // Create Review UI in Logs
  const logList = document.getElementById("log-list");
  const div = document.createElement("div");
  div.className = "log-entry active";
  div.style.borderLeftColor = "var(--warning)";
  div.innerHTML = `
    <div class="log-label">DECISION REQUIRED</div>
    <div style="margin-top:0.5rem; display:flex; gap:1rem;">
      <button class="btn-primary" style="background:var(--success); padding:0.5rem;" onclick="submitReview(true)">Approve Action</button>
      <button class="btn-primary" style="background:var(--danger); padding:0.5rem;" onclick="submitReview(false)">Reject Action</button>
    </div>
  `;
  logList.appendChild(div);
  logList.scrollTop = logList.scrollHeight;
  
  refreshHistory();
}

function submitReview(approved) {
  AppState.ws.send(JSON.stringify({ type: "resume_agent", approved }));
  // Remove buttons strictly speaking not needed as log flows up, but good UX
  addLogEntry("USER", "active", approved ? "Action Approved" : "Action Rejected");
}

// =============================================================================
// UI Helpers
// =============================================================================

function addLogEntry(source, type, text, json) {
  const list = document.getElementById("log-list");
  const div = document.createElement("div");
  div.className = `log-entry ${type}`;
  
  let html = `<div class="log-label">${source}</div><div>${escapeHtml(text)}</div>`;
  
  if (json) {
    html += `<div class="json-block">${escapeHtml(JSON.stringify(json, null, 2))}</div>`;
  }
  
  div.innerHTML = html;
  list.appendChild(div);
  list.scrollTop = list.scrollHeight;
  updateLogCount();
}

function updateLogCount() {
  const count = document.querySelectorAll('.log-entry').length;
  document.getElementById('log-count').textContent = `${count} OPS`;
}

function setBusyState(isBusy) {
  const btn = document.getElementById("start-btn");
  btn.disabled = isBusy;
  btn.textContent = isBusy ? "AGENT RUNNING..." : "INITIALIZE AGENT SEQUENCE 🚀";
}

function clearLogs() {
  document.getElementById("log-list").innerHTML = "";
  updateLogCount();
}

// =============================================================================
// API & Data
// =============================================================================

async function loadThreads() {
  try {
    const res = await fetch("/api/threads");
    const data = await res.json();
    
    const list = document.getElementById("thread-list");
    list.innerHTML = "";
    
    data.threads.forEach(t => {
      const active = t.thread_id === AppState.currentThreadId ? 'active' : '';
      const div = document.createElement("div");
      div.className = `thread-item ${active}`;
      div.onclick = () => selectThread(t.thread_id);
      div.innerHTML = `
        <span class="thread-name">${t.thread_id}</span>
        <button class="thread-delete" onclick="deleteThread(event, '${t.thread_id}')">✕</button>
      `;
      list.appendChild(div);
    });
  } catch(e) { console.error(e); }
}

function selectThread(id) {
  AppState.currentThreadId = id;
  loadThreads(); // Update active state
  clearLogs();
  refreshHistory();
  addLogEntry("SYSTEM", "system", `Session loaded: ${id}`);
}

async function createNewChat() {
  AppState.currentThreadId = null;
  loadThreads();
  clearLogs();
  document.getElementById("history-list").innerHTML = '<div style="text-align: center; color: var(--text-muted); margin-top: 2rem;">New Session</div>';
}

async function deleteThread(e, id) {
  e.stopPropagation();
  if(!confirm("Terminate this session?")) return;
  await fetch(`/api/threads/${id}`, { method: "DELETE" });
  if (AppState.currentThreadId === id) createNewChat();
  else loadThreads();
}

function refreshHistory() {
  if (AppState.currentThreadId) loadHistory(AppState.currentThreadId);
}

async function loadHistory(threadId) {
  const res = await fetch(`/api/threads/${threadId}/history`);
  const data = await res.json();
  
  document.getElementById("checkpoint-count").textContent = `${data.history.length} CHECKPOINTS`;
  const list = document.getElementById("history-list");
  list.innerHTML = "";
  
  data.history.forEach(h => {
    const div = document.createElement("div");
    div.className = "timeline-step";
    div.innerHTML = `
      <div class="step-dot"></div>
      <div class="step-content" onclick="openStatePreview('${h.checkpoint_id}')">
        <div class="step-title" style="display:flex; justify-content:space-between; width:100%; align-items:center; margin-bottom:4px;">
          <span style="font-weight:700; color:var(--text-main); font-size:0.9em;">
            ${h.operation || h.source.toUpperCase()}
          </span>
        </div>
        <div style="font-size: 0.8em; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">
          ${h.preview || 'Step Details'}
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.7em; color:var(--text-muted);">
           <span>ID: ${h.checkpoint_id.substring(0,8)}</span>
           <span>${new Date(h.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    `;
    list.appendChild(div);
  });
}

// =============================================================================
// Modals
// =============================================================================

async function openStatePreview(checkpointId) {
  const modal = document.getElementById("state-modal");
  const code = document.getElementById("state-json");
  modal.classList.add("open");
  code.innerHTML = "Accessing secure archives...";
  
  try {
    const res = await fetch(`/api/threads/${AppState.currentThreadId}/checkpoints/${checkpointId}`);
    const data = await res.json();
    code.textContent = JSON.stringify(data, null, 2);
    
    document.getElementById("resume-btn").onclick = () => {
      closeModal();
      performTimeTravel(checkpointId);
    };
  } catch(e) {
    code.textContent = "Error retrieving data.";
  }
}

function performTimeTravel(checkpointId) {
  if (!confirm("⚠️ WARPING TIMELINE\n\nThis will overwrite all future events in this thread. Confirm?")) return;
  
  clearLogs();
  addLogEntry("SYSTEM", "warning", "INITIATING TIME WARP...");
  
  AppState.ws.send(JSON.stringify({
    type: "time_travel",
    threadId: AppState.currentThreadId,
    checkpointId: checkpointId,
    newInput: {} 
  }));
}

function closeModal() {
  document.getElementById("state-modal").classList.remove("open");
}

function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Boot
document.addEventListener("DOMContentLoaded", init);
