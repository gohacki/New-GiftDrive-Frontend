import React from "react";
import { createRoot } from 'react-dom/client';
import App from "next/app";
import Head from "next/head";
import Router from "next/router";
import { AuthProvider } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';
import { StatisticsProvider } from "../contexts/StatisticsContext";

import PageChange from "components/PageChange/PageChange.js";

import "@fortawesome/fontawesome-free/css/all.min.css";
import "styles/tailwind.css";

let root = null; // Store the root instance

Router.events.on('routeChangeStart', (url) => {
  console.log(`Loading: ${url}`);
  document.body.classList.add('body-page-transition');

  const container = document.getElementById('page-transition');
  
  if (!root) {
    root = createRoot(container); // Initialize the root if it doesn't exist
  }

  root.render(<PageChange path={url} />);
});

Router.events.on('routeChangeComplete', () => {
  safelyUnmountRoot(); // Safely unmount root on route change completion
  document.body.classList.remove('body-page-transition');
});

Router.events.on('routeChangeError', () => {
  safelyUnmountRoot(); // Safely unmount root on route change error
  document.body.classList.remove('body-page-transition');
});

// Helper function to safely unmount the root
function safelyUnmountRoot() {
  const container = document.getElementById('page-transition');
  if (root && container) {
    root.unmount(); // Unmount the root if it exists
    root = null; // Reset root to avoid further updates to unmounted root
  }
}

export default class MyApp extends App {
  componentDidMount() {
    const comment = document.createComment();
    document.insertBefore(comment, document.documentElement);
  }

  static async getInitialProps({ Component, ctx }) {
    let pageProps = {};

    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx);
    }

    return { pageProps };
  }

  render() {
    const { Component, pageProps } = this.props;
    const Layout = Component.layout || (({ children }) => <>{children}</>);

    return (
      <React.Fragment>
        <Head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, shrink-to-fit=no"
          />
          <title>GiftDrive.org</title>
        </Head>
        <AuthProvider>
          <CartProvider>
            <StatisticsProvider>
            <Layout>
              <Component {...pageProps} />
            </Layout>
            </StatisticsProvider>
          </CartProvider>
        </AuthProvider>
      </React.Fragment>
    );
  }
}