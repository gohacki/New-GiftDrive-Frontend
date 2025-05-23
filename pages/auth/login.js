// GiftDrive-Frontend/pages/auth/login.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Auth from 'layouts/Auth.js'; // Your existing layout
import { signIn, useSession } from 'next-auth/react'; // Import signIn and useSession from next-auth

export default function Login() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleLogin = () => {
    setIsSubmitting(true);
    const callbackUrlAfterLogin = router.query.callbackUrl || '/visible/profile';
    signIn('google', { callbackUrl: callbackUrlAfterLogin });
  };

  const handleFacebookLogin = () => {
    setIsSubmitting(true);
    const callbackUrlAfterLogin = router.query.callbackUrl || '/visible/profile';
    signIn('facebook', { callbackUrl: callbackUrlAfterLogin });
  };

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user) {
      const callbackUrl = router.query.callbackUrl || '/visible/profile';
      router.push(typeof callbackUrl === 'string' ? callbackUrl : '/visible/profile');
    }
    if (router.query.error && !localError) {
      let errorMessage = "Login failed. Please check your credentials or try again.";
      if (router.query.error === "CredentialsSignin") {
        errorMessage = "Invalid email or password.";
      } else if (router.query.error === "OAuthAccountNotLinked") {
        errorMessage = "This email is already associated with another account. Please sign in using the original method or reset your password if you used credentials.";
      } else if (router.query.error === "EmailCreateAccount") {
        errorMessage = "This email address is associated with an account created via email/password. Please log in with your password or use the 'Forgot Password' link.";
      } else if (router.query.error) {
        errorMessage = `Login error: ${router.query.error}. Please try again.`;
      }
      setLocalError(errorMessage);
    }
  }, [session, authStatus, router, localError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setIsSubmitting(true);

    const result = await signIn('credentials', {
      redirect: false,
      email: email,
      password: password,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setLocalError(result.error === "CredentialsSignin" ? "Invalid email or password." : result.error);
      console.error('Login failed via credentials:', result.error);
    } else if (result?.ok && !result.error) {
      // Success handled by useEffect
    } else if (!result?.ok) {
      setLocalError("Login attempt failed. Please try again.");
    }
  };

  if (authStatus === "loading" && !session) {
    return (
      <Auth>
        <div className="min-h-screen bg-secondary_green flex items-center justify-center px-4">
          <p className="text-gray-700 text-lg">Loading session...</p>
        </div>
      </Auth>
    );
  }

  return (
    <div className="min-h-screen bg-secondary_green flex items-center justify-center px-4">
      <div className="w-full lg:w-4/12">
        <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">
          <div className="rounded-t mb-0 px-6 py-6">
            <div className="text-center mb-3">
              <h6 className="text-gray-800 text-sm font-bold font-georgia">
                Sign in with
              </h6>
            </div>
            {localError && (
              <div className="text-center mb-3 px-3 py-2 bg-red-100 text-red-700 text-sm rounded">
                <p>{localError}</p>
              </div>
            )}
            <div className="btn-wrapper text-center space-x-2">
              <button
                className="bg-ggreen text-white font-semibold px-6 py-3 rounded-full shadow hover:shadow-lg transition-all duration-150 inline-flex items-center"
                type="button"
                onClick={handleFacebookLogin}
                disabled={isSubmitting || authStatus === "loading"}
              >
                <img alt="Facebook Logo" className="w-5 mr-2" src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" />
                Facebook
              </button>
              <button
                className="bg-ggreen text-white font-semibold px-6 py-3 rounded-full shadow hover:shadow-lg transition-all duration-150 inline-flex items-center"
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmitting || authStatus === "loading"}
              >
                <img alt="Google Logo" className="w-5 mr-2" src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" />
                Google
              </button>
            </div>
            <hr className="mt-6 border-b-1 border-gray-300" />
          </div>
          <div className="flex-auto px-4 lg:px-10 py-10">
            <div className="text-gray-600 text-center mb-3 font-bold">
              <small>Or sign in with credentials</small> {/* Updated text */}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="relative w-full mb-3">
                <label className="block uppercase text-gray-800 text-xs font-bold mb-2" htmlFor="email">Email</label>
                <input
                  type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="border-0 px-3 py-3 placeholder-gray-300 text-gray-800 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full transition-all duration-150"
                  placeholder="Email" required autoComplete="email"
                />
              </div>

              <div className="relative w-full mb-3">
                <label className="block uppercase text-gray-800 text-xs font-bold mb-2" htmlFor="password">Password</label>
                <input
                  type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="border-0 px-3 py-3 placeholder-gray-300 text-gray-800 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full transition-all duration-150"
                  placeholder="Password" required autoComplete="current-password"
                />
              </div>

              <div className="text-center mt-6">
                <button
                  className="bg-ggreen text-white font-semibold uppercase px-6 py-3 rounded-full shadow hover:shadow-lg transition-all duration-150 w-full"
                  type="submit"
                  disabled={isSubmitting || authStatus === "loading"}
                >
                  {isSubmitting ? 'Signing In...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="flex flex-wrap mt-6 relative">
          <div className="w-1/2">
            {/* UPDATED LINK */}
            <Link href="/auth/forgot-password" className="text-gray-800 hover:text-ggreen">
              <small>Forgot password?</small>
            </Link>
          </div>
          <div className="w-1/2 text-right">
            <Link href="/auth/register" className="text-gray-800 hover:text-ggreen">
              <small>Create new account</small>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

Login.layout = Auth;