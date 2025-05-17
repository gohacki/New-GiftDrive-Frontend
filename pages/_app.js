// src/pages/_app.js

import React, { Suspense } from "react";
import Head from "next/head";
import Router from "next/router";
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { SessionProvider } from "next-auth/react";
import Providers from 'components/Providers';
import ErrorBoundary from 'components/ErrorBoundary';
import { ModalProvider } from '../contexts/ModalContext';
import ModalRenderer from '../components/Modals/ModalRenderer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import "@fortawesome/fontawesome-free/css/all.min.css";
import "styles/index.css";

import PropTypes from 'prop-types';

// Configure NProgress
NProgress.configure({ showSpinner: false });

// Route Change Events for NProgress
Router.events.on('routeChangeStart', () => {
  NProgress.start();
});

Router.events.on('routeChangeComplete', () => {
  NProgress.done();
});

Router.events.on('routeChangeError', () => {
  NProgress.done();
});

const MyApp = ({ Component, pageProps: { session, ...pageProps } }) => {
  const Layout = Component.layout || (({ children }) => <>{children}</>);

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <link rel="icon" href="/favicon.ico" />
        <meta name="description" content="GiftDrive.org - Connecting donors with organizations to make a positive impact." />
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content="GiftDrive.org" />
        <meta property="og:description" content="Connecting donors with organizations to make a positive impact." />
        <meta property="og:image" content="https://giveagift-assets.nyc3.cdn.digitaloceanspaces.com/images/GiftDriveOGImage.png" />
        <meta property="og:url" content="https://giftdrive.org" />
        <meta property="og:type" content="website" />
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="GiftDrive.org" />
        <meta name="twitter:description" content="Connecting donors with organizations to make a positive impact." />
        <meta name="twitter:image" content="https://giveagift-assets.nyc3.cdn.digitaloceanspaces.com/images/GiftDriveTwitterImage.png" />
        <meta name="theme-color" content="#ffffff" />
        <title>GiftDrive.org</title>
      </Head>
      <SessionProvider session={session}>
        <Providers>
          <ErrorBoundary>
            <Layout>
              <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
                <ModalProvider>
                  <Component {...pageProps} />
                  <ToastContainer />
                  <ModalRenderer />
                </ModalProvider>
              </Suspense>
            </Layout>
          </ErrorBoundary>
        </Providers>
      </SessionProvider>
    </>
  );
};

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired,
};

export default MyApp;
