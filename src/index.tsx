import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './types/env';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { ChatCloudflareWorkersAI } from './lib/ChatCloudflareWorkersAI';
import { kefu, EmailAgentStateType } from './langgraph';
import { Command } from '@langchain/langgraph';
import { createDb } from './db';

import { Index } from './pages/Index';
import { Chat } from './pages/Chat';

const app = new Hono<Env>();

// ==================== 中间件 ====================
app.use('/api/*', logger());
app.use('/api/*', cors());
app.use('*', (c, next) => {
  try {
    if (c.env.my_db) {
      c.set('db', createDb(c.env.my_db));
    } else {
      console.warn('DB binding not found');
    }
  } catch (e) {
    console.error('DB Warning:', e);
  }
  return next();
});
app.onError(errorHandler);

// ==================== 路由 ====================
// 首页
app.get('/', (c) => {
  return c.html(<Index title="Index" time={new Date().toISOString()} />);
});

// Chat UI
app.get('/chat-ui', (c) => {
  return c.html(<Chat />);
});

app.get(
  '/ws-chat',
  upgradeWebSocket((c) => {
    console.log('WS upgrade request received');
    // Store agent context for resume
    let currentApp: Awaited<ReturnType<typeof kefu>> | null = null;
    let currentConfig: { configurable: { thread_id: string } } | null = null;

    return {
      async onMessage(event, ws) {
        try {
          const data = JSON.parse(event.data as string);

          if (data.type === 'start_agent') {
            const model = new ChatCloudflareWorkersAI({
              model: '@cf/meta/llama-3-8b-instruct',
              binding: c.env.AI,
            });
            currentApp = await kefu(model);
            currentConfig = {
              configurable: { thread_id: data.threadId || `thread_${Date.now()}` },
            };

            const initialState: EmailAgentStateType = {
              emailContent:
                data.emailContent || 'I was charged twice for my subscription! This is urgent!',
              senderEmail: data.senderEmail || 'customer@example.com',
              emailId: data.emailId || `email_${Date.now()}`,
            };

            ws.send(
              JSON.stringify({
                type: 'agent_started',
                message: 'Agent execution started',
                initialState,
              })
            );

            // Stream node-by-node updates
            const stream = await currentApp.stream(initialState, currentConfig);
            let interrupted = false;

            for await (const chunk of stream) {
              const entries = Object.entries(chunk);
              if (entries.length > 0) {
                const [nodeName, output] = entries[0];

                if (nodeName === '__interrupt__') {
                  interrupted = true;
                  ws.send(
                    JSON.stringify({
                      type: 'agent_interrupted',
                      message: '等待人工审核',
                      interruptData: output,
                      threadId: currentConfig.configurable.thread_id,
                      timestamp: new Date().toISOString(),
                    })
                  );
                } else {
                  ws.send(
                    JSON.stringify({
                      type: 'node_update',
                      node: nodeName,
                      output: output,
                      timestamp: new Date().toISOString(),
                    })
                  );
                }
              }
            }

            if (!interrupted) {
              ws.send(
                JSON.stringify({
                  type: 'agent_complete',
                  message: 'Agent execution completed',
                  timestamp: new Date().toISOString(),
                })
              );
            }
          } else if (data.type === 'resume_agent') {
            // Human approved/rejected the review
            if (!currentApp || !currentConfig) {
              ws.send(JSON.stringify({ type: 'error', message: 'No agent to resume' }));
              return;
            }

            ws.send(
              JSON.stringify({
                type: 'node_update',
                node: 'humanReview',
                output: {
                  thinking: data.approved
                    ? '✅ 人工审核通过，继续执行...'
                    : '❌ 人工拒绝，终止流程',
                },
                timestamp: new Date().toISOString(),
              })
            );

            // Resume the graph with human decision
            const resumeCommand = new Command({
              resume: {
                approved: data.approved,
                editedResponse: data.editedResponse || undefined,
              },
            });

            const resumeStream = await currentApp.stream(resumeCommand, currentConfig);

            for await (const chunk of resumeStream) {
              const entries = Object.entries(chunk);
              if (entries.length > 0) {
                const [nodeName, output] = entries[0];
                ws.send(
                  JSON.stringify({
                    type: 'node_update',
                    node: nodeName,
                    output: output,
                    timestamp: new Date().toISOString(),
                  })
                );
              }
            }

            ws.send(
              JSON.stringify({
                type: 'agent_complete',
                message: data.approved ? 'Agent execution completed' : 'Agent stopped by human',
                timestamp: new Date().toISOString(),
              })
            );
          }
        } catch (error) {
          console.error('WebSocket error:', error);
          ws.send(
            JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : 'Unknown error',
            })
          );
        }
      },
      onClose() {
        console.log('WebSocket connection closed');
        currentApp = null;
        currentConfig = null;
      },
    };
  })
);

app.post('/chat', async (c) => {
  const model = new ChatCloudflareWorkersAI({
    model: '@cf/meta/llama-3-8b-instruct',
    binding: c.env.AI,
  });
  const kefuapp = await kefu(model);

  // Test with an urgent billing issue
  const initialState: EmailAgentStateType = {
    emailContent: 'I was charged twice for my subscription! This is urgent!',
    senderEmail: 'customer@example.com',
    emailId: 'email_123',
  };

  // Run with a thread_id for persistence
  const config = { configurable: { thread_id: 'customer_123' } };
  const result = await kefuapp.invoke(initialState, config);
  // The graph will pause at human_review
  console.log(`Draft ready for review: ${result.responseText?.substring(0, 100)}...`);

  // const humanResponse = new Command({
  //   resume: {
  //     approved: true,
  //     editedResponse:
  //       "We sincerely apologize for the double charge. I've initiated an immediate refund...",
  //   },
  // });

  // // Resume execution
  // const finalResult = await app.invoke(humanResponse, config);
  console.log('Email sent successfully!');
  return c.json({ a: 1 });
});

// API 路由
app.route('/api', routes);

// 404 处理
app.notFound(notFoundHandler);

export default app;
