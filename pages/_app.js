import React, { useEffect, useState } from "react";
import PropTypes from "prop-types"; // Import PropTypes
import Head from "next/head";
import Router from "next/router";
import { AuthProvider } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';
import { StatisticsProvider } from '../contexts/StatisticsContext';

import PageChange from "components/PageChange/PageChange.js";

import "@fortawesome/fontawesome-free/css/all.min.css";
import "styles/index.css";

const MyApp = ({ Component, pageProps }) => {
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    const handleRouteChangeStart = (url) => {
      console.log(`Loading: ${url}`);
      setLoading(true);
      setCurrentPath(url);
      document.body.classList.add('body-page-transition');
    };

    const handleRouteChangeComplete = () => {
      setLoading(false);
      document.body.classList.remove('body-page-transition');
    };

    const handleRouteChangeError = () => {
      setLoading(false);
      document.body.classList.remove('body-page-transition');
    };

    Router.events.on('routeChangeStart', handleRouteChangeStart);
    Router.events.on('routeChangeComplete', handleRouteChangeComplete);
    Router.events.on('routeChangeError', handleRouteChangeError);

    return () => {
      Router.events.off('routeChangeStart', handleRouteChangeStart);
      Router.events.off('routeChangeComplete', handleRouteChangeComplete);
      Router.events.off('routeChangeError', handleRouteChangeError);
    };
  }, []);

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
            {/* {loading && <PageChange path={currentPath} />} */}
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </StatisticsProvider>
        </CartProvider>
      </AuthProvider>
    </React.Fragment>
  );
};

// Prop validation for MyApp
MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired, // Component must be a React component
  pageProps: PropTypes.object, // pageProps is an optional object
};

export default MyApp;