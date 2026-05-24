import { define } from "@/utils.ts";

export default define.page(({ Component }) => {
  return (
    <html lang="ro">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#27504d" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Vocabular ES" />
        <title>Vocabular spaniol</title>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="/styles.css" />
        <script type="module" src="/register-sw.js"></script>
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});
