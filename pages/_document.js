// pages/_document.js
import React from "react";
import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <meta charSet="utf-8" />
          <meta name="theme-color" content="#11393B" /> {/* Updated to your ggreen color */}

          {/* Favicons & App Icons */}
          {/* For modern browsers - SVG is preferred */}
          <link rel="icon" href="/img/brand/favicon.svg" type="image/svg+xml" />
          {/* Fallback ICO for older browsers/some crawlers (place in public/favicon.ico) */}
          <link rel="shortcut icon" href="/favicon.ico" />
          {/* PNG favicons for different resolutions */}
          <link rel="icon" type="image/png" sizes="16x16" href="/img/brand/favicon-16x16.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/img/brand/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="96x96" href="/img/brand/favicon-96x96.png" />
          {/* Apple Touch Icon */}
          <link rel="apple-touch-icon" sizes="180x180" href="/img/brand/apple-touch-icon.png" />
          {/* Web App Manifest */}
          <link rel="manifest" href="/img/brand/site.webmanifest" />
          <meta name="apple-mobile-web-app-title" content="GiftDrive" />
          <meta name="application-name" content="GiftDrive" /> {/* Good to add for completeness */}
          <meta name="msapplication-TileColor" content="#11393B" /> {/* For Windows Tiles */}
          {/* Optional: <meta name="msapplication-TileImage" content="/img/brand/mstile-144x144.png" /> */}


          {/* Google Fonts - Inter */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
            rel="stylesheet"
          />
        </Head>
        <body className="text-slate-700 antialiased"> {/* Changed blueGray to slate for consistency */}
          <div id="page-transition"></div>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;