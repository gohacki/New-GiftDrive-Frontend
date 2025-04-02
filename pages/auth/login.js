import React, { useState, useContext, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Auth from 'layouts/Auth.js';
import { AuthContext } from '../../contexts/AuthContext';
// const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function Login() {
  const { user, login } = useContext(AuthContext);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [setError] = useState('');

  // const handleGoogleLogin = () => {
  //   window.location.href = `${apiUrl}/api/auth/google`;
  // };

  // const handleFacebookLogin = () => {
  //   window.location.href = `${apiUrl}/api/auth/facebook`;
  // };

  useEffect(() => {
    if (user && user.account_id) {
      router.push('../visible/profile');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await login({ email, password });
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.response?.data?.message || 'An error occurred during login.');
    }
  };

  return (
    <div className="min-h-screen bg-secondary_green flex items-center justify-center px-4">
      <div className="w-full lg:w-4/12">
        <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">
          {/* <div className="rounded-t mb-0 px-6 py-6"> */}
          {/* <div className="text-center mb-3">
              <h6 className="text-gray-800 text-sm font-bold font-georgia">
                Sign in with
              </h6>
            </div> */}
          {/* {error && (
              <div className="text-center mb-3">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )} */}
          {/* <div className="btn-wrapper text-center space-x-2">
              <button
                className="bg-ggreen text-white font-semibold px-6 py-3 rounded-full shadow hover:shadow-lg transition-all duration-150 inline-flex items-center"
                type="button"
                onClick={handleFacebookLogin}
              >
                <img
                  alt="Facebook Logo"
                  className="w-5 mr-2"
                  src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg"
                />
                Facebook
              </button>
              <button
                className="bg-ggreen text-white font-semibold px-6 py-3 rounded-full shadow hover:shadow-lg transition-all duration-150 inline-flex items-center"
                type="button"
                onClick={handleGoogleLogin}
              >
                <img
                  alt="Google Logo"
                  className="w-5 mr-2"
                  src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png"
                />
                Google
              </button> */}
          {/* </div> */}
          {/* <hr className="mt-6 border-b-1 border-gray-300" /> */}
          {/* </div> */}
          <div className="flex-auto px-4 lg:px-10 py-10">
            {/* <div className="text-gray-600 text-center mb-3 font-bold">
              <small>Sign In Below</small>
            </div> */}
            <form onSubmit={handleSubmit}>
              <div className="relative w-full mb-3">
                <label
                  className="block uppercase text-gray-800 text-xs font-bold mb-2"
                  htmlFor="email"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-0 px-3 py-3 placeholder-gray-300 text-gray-800 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full transition-all duration-150"
                  placeholder="Email"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="relative w-full mb-3">
                <label
                  className="block uppercase text-gray-800 text-xs font-bold mb-2"
                  htmlFor="password"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-0 px-3 py-3 placeholder-gray-300 text-gray-800 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full transition-all duration-150"
                  placeholder="Password"
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="text-center mt-6">
                <button
                  className="bg-ggreen text-white font-semibold uppercase px-6 py-3 rounded-full shadow hover:shadow-lg transition-all duration-150 w-full"
                  type="submit"
                >
                  Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="flex flex-wrap mt-6 relative">
          <div className="w-1/2">
            <a
              href="#forgot-password"
              onClick={(e) => e.preventDefault()}
              className="text-gray-800"
            >
              <small>Forgot password?</small>
            </a>
          </div>
          <div className="w-1/2 text-right">
            <Link href="/auth/register" className="text-gray-800">
              <small>Create new account</small>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

Login.layout = Auth;
