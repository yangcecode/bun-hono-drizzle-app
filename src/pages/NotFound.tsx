import { css } from 'hono/css';
import { Layout } from '../layouts';

const containerClass = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 2rem;
  color: #333;
`;

const titleClass = css`
  font-size: 6rem;
  font-weight: 700;
  color: #e74c3c;
  margin: 0;
  line-height: 1;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
`;

const subtitleClass = css`
  font-size: 1.5rem;
  margin: 1rem 0 2rem;
  color: #7f8c8d;
`;

const buttonClass = css`
  display: inline-block;
  padding: 0.8rem 2rem;
  background-color: #3498db;
  color: white;
  text-decoration: none;
  font-size: 1.1rem;
  border-radius: 5px;
  transition:
    background-color 0.3s ease,
    transform 0.2s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: #2980b9;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const illustrationClass = css`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

export const NotFound = () => {
  return (
    <Layout title="404 Not Found">
      <div class={containerClass}>
        <div class={illustrationClass}>🚧</div>
        <h1 class={titleClass}>404</h1>
        <p class={subtitleClass}>Oops! The page you are looking for does not exist.</p>
        <a href="/" class={buttonClass}>
          Go Back Home
        </a>
      </div>
    </Layout>
  );
};
