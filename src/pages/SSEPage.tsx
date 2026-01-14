import { html } from 'hono/html';
import { Layout } from '../layouts/Layout';

export const SSEPage = () => {
  return (
    <Layout title="SSE Demo">
      <div style="padding: 20px; font-family: sans-serif;">
        <h1>Server-Sent Events Demo</h1>
        <p>Connecting to /api/sse/stream...</p>
        <ul
          id="messages"
          style="border: 1px solid #ccc; padding: 10px; max-height: 300px; overflow-y: auto; list-style-type: none;"
        ></ul>
      </div>
      {html`
        <script>
          (function () {
            const list = document.getElementById('messages');
            const evtSource = new EventSource('/api/sse/stream');

            evtSource.addEventListener('time-update', (event) => {
              const li = document.createElement('li');
              li.textContent = event.data;
              li.style.padding = '5px 0';
              li.style.borderBottom = '1px solid #eee';
              list.appendChild(li);
              list.scrollTop = list.scrollHeight;
            });

            evtSource.onerror = (err) => {
              console.error('EventSource failed:', err);
              const li = document.createElement('li');
              li.textContent = 'Connection lost or error occurred.';
              li.style.color = 'red';
              list.appendChild(li);
              evtSource.close();
            };
          })();
        </script>
      `}
    </Layout>
  );
};
