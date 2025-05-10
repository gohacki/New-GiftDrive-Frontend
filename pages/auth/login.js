// GiftDrive-Frontend/pages/auth/login.js
import React, { useState, useContext, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Auth from 'layouts/Auth.js';
import { AuthContext } from '../../contexts/AuthContext'; // Path should be correct

// const apiUrl = process.env.NEXT_PUBLIC_API_URL; // Not directly used here if AuthContext handles API calls

export default function Login() {
  // ***** CORRECTED: Destructure loading and rename it to authLoading *****
  const { user, login, loading: authLoading } = useContext(AuthContext);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL; // Needed for social logins

  const handleGoogleLogin = () => {
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  const handleFacebookLogin = () => {
    window.location.href = `${apiUrl}/api/auth/facebook`;
  };

  useEffect(() => {
    // Redirect if user is already logged in and AuthContext is not loading
    if (!authLoading && user && user.account_id) {
      console.log("Login page: User already authenticated, redirecting to profile.");
      router.push('../visible/profile');
    }
  }, [user, authLoading, router]); // Add authLoading as a dependency

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    try {
      await login({ email, password });
      // Successful login will trigger the useEffect above for redirection
    } catch (err) {
      console.error('Login failed on frontend:', err);
      setLocalError(err.response?.data?.message || err.message || 'An error occurred during login.');
    }
  };

  // If AuthContext is still loading, you might want to show a loading state for the whole form
  // or disable the button specifically as you've done.
  if (authLoading && !user) { // Show loading only if not yet authenticated
    return (
      <div className="min-h-screen bg-secondary_green flex items-center justify-center px-4">
        <p className="text-gray-700 text-lg">Loading...</p>
      </div>
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
                disabled={authLoading} // Disable social logins too if auth is processing
              >
                <img alt="Facebook Logo" className="w-5 mr-2" src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" />
                Facebook
              </button>
              <button
                className="bg-ggreen text-white font-semibold px-6 py-3 rounded-full shadow hover:shadow-lg transition-all duration-150 inline-flex items-center"
                type="button"
                onClick={handleGoogleLogin}
                disabled={authLoading}
              >
                <img alt="Google Logo" className="w-5 mr-2" src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" />
                Google
              </button>
            </div>
            <hr className="mt-6 border-b-1 border-gray-300" />
          </div>
          <div className="flex-auto px-4 lg:px-10 py-10">
            <div className="text-gray-600 text-center mb-3 font-bold">
              <small>Sign In Below</small>
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
                  disabled={authLoading} // Use authLoading from context
                >
                  {authLoading ? 'Logging in...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="flex flex-wrap mt-6 relative">
          <div className="w-1/2">
            <a href="#forgot-password" onClick={(e) => e.preventDefault()} className="text-gray-800"><small>Forgot password?</small></a>
          </div>
          <div className="w-1/2 text-right">
            <Link href="/auth/register" className="text-gray-800"><small>Create new account</small></Link>
          </div>
        </div>
      </div>
    </div>
  );
}

Login.layout = Auth;