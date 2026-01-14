import type { FC } from "hono/jsx";
import { Style } from "hono/css";

export const Layout: FC = (props) => {
  return (
    <html>
      <head>
        <title>{props.title}</title>
        <link rel="stylesheet" href="/static/style.css" />
        <Style />
      </head>
      <body>{props.children}</body>
    </html>
  );
};
