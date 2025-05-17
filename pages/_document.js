// pages/_document.js
import React from "react";
import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <meta charSet="utf-8" />
          <meta name="theme-color" content="#000000" /> {/* Or your actual theme color */}

          {/* Favicons and Manifest */}
          <link rel="icon" type="image/png" href="/img/brand/favicon-96x96.png" sizes="96x96" />
          <link rel="icon" type="image/svg+xml" href="/img/brand/favicon.svg" />
          <link rel="shortcut icon" href="/img/brand/favicon.ico" />
          <link rel="apple-touch-icon" sizes="180x180" href="/img/brand/apple-touch-icon.png" />
          <meta name="apple-mobile-web-app-title" content="GiftDrive" /> {/* Updated title */}
          <link rel="manifest" href="/img/brand/site.webmanifest" />

          {/* Google Fonts - Inter */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
          {/* Ensure you request all necessary weights for Inter */}
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
            rel="stylesheet"
          />
          {/* Removed Montserrat as it's not the primary font anymore */}
        </Head>
        <body className="text-blueGray-700 antialiased"> {/* This class will now use Inter due to body style changes */}
          <div id="page-transition"></div>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;