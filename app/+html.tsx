import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <ScrollViewStyleReset />

        {/* Add Google Fonts for Rajdhani explicitly */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Load the actual font files directly so React Native Web can use the names it registers */}
        <style dangerouslySetInnerHTML={{ __html: `
          body {
            font-family: 'Rajdhani', sans-serif;
          }
          @font-face {
            font-family: 'Rajdhani_500Medium';
            src: url('https://fonts.gstatic.com/s/rajdhani/v15/LDI2apCSOBg7S-QT7pb0BE-Q.woff2') format('woff2');
            font-weight: 500;
          }
          @font-face {
            font-family: 'Rajdhani_600SemiBold';
            src: url('https://fonts.gstatic.com/s/rajdhani/v15/LDI2apCSOBg7S-QT7pb0BE-Q.woff2') format('woff2');
            font-weight: 600;
          }
          @font-face {
            font-family: 'Rajdhani_700Bold';
            src: url('https://fonts.gstatic.com/s/rajdhani/v15/LDI2apCSOBg7S-QT7pb0BE-Q.woff2') format('woff2');
            font-weight: 700;
          }
          /* MaterialIcons web fallback */
          @font-face {
            font-family: 'MaterialIcons';
            src: url('https://cdnjs.cloudflare.com/ajax/libs/material-design-icons/3.0.1/iconfont/MaterialIcons-Regular.woff2') format('woff2');
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
