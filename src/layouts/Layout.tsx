import type { FC, PropsWithChildren } from 'hono/jsx';
import { Style } from 'hono/css';

interface LayoutProps {
  title: string;
  extraHead?: any;
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = (props) => {
  return (
    <html>
      <head>
        <title>{props.title}</title>
        <link rel="stylesheet" href="/static/style.css" />
        <Style />
        {props.extraHead}
      </head>
      <body>{props.children}</body>
    </html>
  );
};
