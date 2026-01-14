import { html } from 'hono/html';
import { Layout } from '../layouts';

export const WebSocketDemo = () => {
  return (
    <Layout title="WebSocket Demo">
      <h1>WebSocket Demo</h1>
      <div>
        <button id="connectBtn">Connect</button>
        <button id="sendBtn" disabled>
          Send "Hello"
        </button>
        <button id="closeBtn" disabled>
          Close
        </button>
      </div>
      <div id="status">Status: Disconnected</div>
      <ul
        id="messages"
        style="max-height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; list-style-type: none;"
      ></ul>

      {html`
        <script>
          let ws;
          const connectBtn = document.getElementById('connectBtn');
          const sendBtn = document.getElementById('sendBtn');
          const closeBtn = document.getElementById('closeBtn');
          const statusDiv = document.getElementById('status');
          const messagesList = document.getElementById('messages');

          const log = (msg) => {
            const li = document.createElement('li');
            li.textContent = msg;
            messagesList.appendChild(li);
            messagesList.scrollTop = messagesList.scrollHeight;
          };

          connectBtn.onclick = () => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = \`\${protocol}//\${window.location.host}/ws\`;

            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
              statusDiv.textContent = 'Status: Connected';
              log('Connected to ' + wsUrl);
              connectBtn.disabled = true;
              sendBtn.disabled = false;
              closeBtn.disabled = false;
            };

            ws.onmessage = (event) => {
              log('Received: ' + event.data);
            };

            ws.onclose = () => {
              statusDiv.textContent = 'Status: Disconnected';
              log('Disconnected');
              connectBtn.disabled = false;
              sendBtn.disabled = true;
              closeBtn.disabled = true;
              ws = null;
            };

            ws.onerror = (error) => {
              log('Error: ' + JSON.stringify(error));
            };
          };

          sendBtn.onclick = () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              const msg = 'Hello at ' + new Date().toISOString();
              ws.send(msg);
              log('Sent: ' + msg);
            }
          };

          closeBtn.onclick = () => {
            if (ws) {
              ws.close();
            }
          };
        </script>
      `}
    </Layout>
  );
};
