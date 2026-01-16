import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './types/env';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { ChatCloudflareWorkersAI } from './lib/ChatCloudflareWorkersAI';
import { kefu, EmailAgentStateType } from './langgraph';
import { createCheckpointer } from './langgraph/checkpointer';
import { Command } from '@langchain/langgraph';
import { createDb } from './db';

import { Index } from './pages/Index';
import { Chat } from './pages/Chat';

import { Checkpoint } from '@langchain/langgraph-checkpoint';

const app = new Hono<Env>();

// Helper to map node names to user-friendly operation labels
function getOperationLabel(source: string): string {
  const mapping: Record<string, string> = {
    readEmail: '📧 Email Ingestion',
    classifyIntent: '🧠 Intent Analysis',
    searchDocumentation: '🔍 Knowledge Search',
    bugTracking: '🐛 Bug Reporting',
    draftResponse: '✍️ Drafting Response',
    humanReview: '👤 Human Review',
    sendReply: '📤 Sending Reply',
    loop: '⚙️ System Process',
  };
  return mapping[source] || (source === 'input' ? '📥 User Input' : `📝 ${source}`);
}

// Helper to generate a meaningful preview for a checkpoint
function getCheckpointPreview(checkpoint: Checkpoint): string {
  const channelValues = checkpoint.channel_values || {};

  // 1. Check for User Input
  // Typically stored in 'humanReview' or the input keys if relevant
  // Adjust key names based on your actual state structure
  if (channelValues.humanReview) {
    const humanReview = channelValues.humanReview as { approved?: boolean };
    if (humanReview.approved !== undefined) {
      return humanReview.approved ? '✅ Human Approved' : '❌ Human Rejected';
    }
  }

  // 2. Output from 'agent' node
  if (channelValues.thinking) {
    const text = channelValues.thinking as string;
    return `Thinking: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`;
  }

  if (channelValues.classification) {
    const cls = channelValues.classification as { intent: string };
    return `Intent: ${cls.intent}`;
  }

  if (channelValues.responseText) {
    const text = channelValues.responseText as string;
    return `Draft: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`;
  }

  // 3. Fallback for initial states or unknown
  if (channelValues.emailContent) {
    return '📧 Email Received';
  }

  return 'Processing Step';
}

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
    let currentConfig: { configurable: { thread_id: string; checkpoint_id?: string } } | null =
      null;

    // Create checkpointer from D1 database for persistence
    const getCheckpointer = () => {
      if (!c.env.my_db) {
        console.warn('D1 database not available, running without persistence');
        return undefined;
      }
      return createCheckpointer(c.env.my_db);
    };

    return {
      async onMessage(event, ws) {
        try {
          const data = JSON.parse(event.data as string);

          // Common helper to handle stream updates and interrupts
          const handleStreamUpdates = async (stream: any, threadId: string): Promise<boolean> => {
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
                      threadId: threadId,
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
            return interrupted;
          };

          if (data.type === 'start_agent') {
            // Create model and agent with D1 checkpointer
            const model = new ChatCloudflareWorkersAI({
              model: '@cf/meta/llama-3-8b-instruct',
              binding: c.env.AI,
            });
            const checkpointer = getCheckpointer();
            currentApp = await kefu(model, checkpointer);
            const threadId = data.threadId || `thread_${Date.now()}`;
            // Preserve checkpoint_id if we are continuing on the same thread
            let checkpointId = undefined;
            if (
              currentConfig &&
              currentConfig.configurable.thread_id === threadId &&
              currentConfig.configurable.checkpoint_id
            ) {
              checkpointId = currentConfig.configurable.checkpoint_id;
            }

            currentConfig = {
              configurable: {
                thread_id: threadId,
                checkpoint_id: checkpointId,
              },
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
            const interrupted = await handleStreamUpdates(
              stream,
              currentConfig.configurable.thread_id
            );

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

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const resumeStream = await currentApp.stream(resumeCommand as any, currentConfig);

            const interrupted = await handleStreamUpdates(
              resumeStream,
              currentConfig.configurable.thread_id
            );

            if (!interrupted) {
              ws.send(
                JSON.stringify({
                  type: 'agent_complete',
                  message: data.approved ? 'Agent execution completed' : 'Agent stopped by human',
                  timestamp: new Date().toISOString(),
                })
              );
            }
          } else if (data.type === 'resume_thread') {
            // Resume an existing thread from its last checkpoint (Durable Execution)
            const checkpointer = getCheckpointer();
            if (!checkpointer) {
              ws.send(JSON.stringify({ type: 'error', message: 'Persistence not available' }));
              return;
            }

            const model = new ChatCloudflareWorkersAI({
              model: '@cf/meta/llama-3-8b-instruct',
              binding: c.env.AI,
            });
            currentApp = await kefu(model, checkpointer);
            currentConfig = {
              configurable: { thread_id: data.threadId },
            };

            // Get the current state
            const state = await currentApp.getState(currentConfig);

            // Send full state update
            ws.send(
              JSON.stringify({
                type: 'node_update',
                node: 'restored_state',
                output: state.values,
                timestamp: new Date().toISOString(),
              })
            );

            ws.send(
              JSON.stringify({
                type: 'thread_resumed',
                threadId: data.threadId,
                state: state.values,
                next: state.next,
                checkpointId: currentConfig.configurable.checkpoint_id,
                timestamp: new Date().toISOString(),
              })
            );
          } else if (data.type === 'get_history') {
            // Get state history for Time Travel
            const checkpointer = getCheckpointer();
            if (!checkpointer) {
              ws.send(JSON.stringify({ type: 'error', message: 'Persistence not available' }));
              return;
            }

            const config = { configurable: { thread_id: data.threadId } };
            const history: Array<{
              checkpoint_id: string;
              step: number;
              source: string;
              operation: string;
              preview: string;
              timestamp: string;
            }> = [];

            for await (const tuple of checkpointer.list(config)) {
              history.push({
                checkpoint_id: tuple.config.configurable?.checkpoint_id as string,
                step: tuple.metadata?.step ?? -1,
                source: tuple.metadata?.source ?? 'unknown',
                operation: getOperationLabel(tuple.metadata?.source || 'unknown'),
                preview: getCheckpointPreview(tuple.checkpoint),
                timestamp: tuple.checkpoint.ts,
              });
            }
            console.log('Sending history update:', JSON.stringify(history.slice(0, 1), null, 2));

            ws.send(
              JSON.stringify({
                type: 'history',
                threadId: data.threadId,
                history,
                count: history.length,
                timestamp: new Date().toISOString(),
              })
            );
          } else if (data.type === 'time_travel') {
            // Time Travel: Resume from a specific checkpoint
            const checkpointer = getCheckpointer();
            if (!checkpointer) {
              ws.send(JSON.stringify({ type: 'error', message: 'Persistence not available' }));
              return;
            }

            const model = new ChatCloudflareWorkersAI({
              model: '@cf/meta/llama-3-8b-instruct',
              binding: c.env.AI,
            });
            currentApp = await kefu(model, checkpointer);

            // Set config to start from specific checkpoint
            currentConfig = {
              configurable: {
                thread_id: data.threadId,
                checkpoint_id: data.checkpointId,
              },
            };

            ws.send(
              JSON.stringify({
                type: 'time_travel_started',
                threadId: data.threadId,
                fromCheckpoint: data.checkpointId,
                message: '从历史检查点恢复执行',
                timestamp: new Date().toISOString(),
              })
            );

            // Always show the state at that checkpoint first
            const state = await currentApp.getState(currentConfig);
            if (state && state.values) {
              ws.send(
                JSON.stringify({
                  type: 'node_update',
                  node: 'restored_state',
                  output: state.values,
                  timestamp: new Date().toISOString(),
                })
              );
            }

            // If new input provided, execute from that checkpoint
            if (data.newInput) {
              const stream = await currentApp.stream(data.newInput, currentConfig);
              const interrupted = await handleStreamUpdates(
                stream,
                currentConfig.configurable.thread_id
              );

              if (!interrupted) {
                ws.send(
                  JSON.stringify({
                    type: 'agent_complete',
                    message: 'Time travel execution completed',
                    timestamp: new Date().toISOString(),
                  })
                );
              }
            }
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
