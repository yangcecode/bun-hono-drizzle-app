import { css } from 'hono/css';
import { Layout } from '../layouts';

const contentClass = css`
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-top: 1rem;

  &:hover {
    box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
  }
`;

const titleClass = css`
  font-size: 2rem;
  color: #2c3e50;
  margin-bottom: 0.5rem;
`;

export const Index = (props: { title: string; time: string }) => {
  return (
    <Layout title={props.title}>
      <h1 class={titleClass}>Index</h1>
      <div class={contentClass}>
        <p>Current Time: {props.time}</p>
        <p style="color: blue;">This text is blue (inline style)</p>
        <p>The container above uses a unique, scoped class name!</p>
      </div>
    </Layout>
  );
};
