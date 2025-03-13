import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router'; 
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import Link from 'next/link';

// Import the Auth layout
import Auth from "layouts/Auth.js";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const RegisterPage = () => {
  const { user, login } = useContext(AuthContext);
  const router = useRouter();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');

  // Redirect logic
  useEffect(() => {
    if (user) {
      router.push('../visible/profile');
    }
  }, [user, router]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      // Send a POST request to the backend to register the user
      await axios.post(`${apiUrl}/api/auth/register`, {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      }, { withCredentials: true });

      // Log the user in by updating the AuthContext
      await login({ email: formData.email, password: formData.password });

      // Redirect to the account page
      router.push('../visible/profile');
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.response?.data?.message || 'An error occurred during registration.');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  const handleFacebookLogin = () => {
    window.location.href = `${apiUrl}/api/auth/facebook`;
  };

  return (
    <div className="min-h-screen bg-secondary_green flex items-center justify-center px-4 pt-24">
      <div className="w-full lg:w-6/12 px-4">
        <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">
          {/* Header Section with Social Logins */}
          <div className="rounded-t mb-0 px-6 py-6">
            <div className="text-center mb-3">
              <h6 className="text-gray-800 text-sm font-bold font-georgia">
                Sign up with
              </h6>
            </div>
            <div className="btn-wrapper text-center space-x-2">
              {/* Google Button */}
              <button
                className="bg-ggreen text-white font-semibold px-6 py-3 rounded-full shadow hover:shadow-lg transition-all duration-150 inline-flex items-center"
                type="button"
                onClick={handleGoogleLogin}
              >
                <img alt="Google" className="w-5 mr-2" src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" />
                Google
              </button>
              {/* Facebook Button */}
              <button
                className="bg-ggreen text-white font-semibold px-6 py-3 rounded-full shadow hover:shadow-lg transition-all duration-150 inline-flex items-center"
                type="button"
                onClick={handleFacebookLogin}
              >
                <img alt="Facebook" className="w-5 mr-2" src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" />
                Facebook
              </button>
            </div>
            <hr className="mt-6 border-b-1 border-gray-300" />
          </div>
          {/* Form Section */}
          <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
            <div className="text-gray-600 text-center mb-3 font-bold">
              <small>Or sign up with your credentials</small>
            </div>
            {/* Display Error Message */}
            {error && (
              <div
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
                role="alert"
              >
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} noValidate>
              {/* Username */}
              <div className="relative w-full mb-3">
                <label
                  className="block uppercase text-gray-800 text-xs font-bold mb-2"
                  htmlFor="username"
                >
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="border-0 px-3 py-3 placeholder-gray-300 text-gray-800 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full transition-all duration-150"
                  placeholder="Username"
                  required
                  autoComplete="username"
                />
              </div>

              {/* Email */}
              <div className="relative w-full mb-3">
                <label
                  className="block uppercase text-gray-800 text-xs font-bold mb-2"
                  htmlFor="email"
                >
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="border-0 px-3 py-3 placeholder-gray-300 text-gray-800 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full transition-all duration-150"
                  placeholder="Email"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="relative w-full mb-3">
                <label
                  className="block uppercase text-gray-800 text-xs font-bold mb-2"
                  htmlFor="password"
                >
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="border-0 px-3 py-3 placeholder-gray-300 text-gray-800 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full transition-all duration-150"
                  placeholder="Password"
                  required
                  autoComplete="new-password"
                />
              </div>

              {/* Confirm Password */}
              <div className="relative w-full mb-3">
                <label
                  className="block uppercase text-gray-800 text-xs font-bold mb-2"
                  htmlFor="confirmPassword"
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="border-0 px-3 py-3 placeholder-gray-300 text-gray-800 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full transition-all duration-150"
                  placeholder="Confirm Password"
                  required
                  autoComplete="new-password"
                />
              </div>

              {/* Privacy Policy Agreement */}
              <div>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    id="customCheckRegister"
                    type="checkbox"
                    className="form-checkbox border-0 rounded text-gray-800 ml-1 w-5 h-5 transition-all duration-150"
                    required
                  />
                  <span className="ml-2 text-sm font-semibold text-gray-800">
                    I agree with the{' '}
                    <a
                      href="/privacy-policy" // Update with actual privacy policy route
                      className="text-ggreen"
                      onClick={(e) => e.preventDefault()}
                    >
                      Privacy Policy
                    </a>
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="text-center mt-6">
                <button
                  className="bg-ggreen text-white font-semibold uppercase px-6 py-3 rounded-full shadow hover:shadow-lg transition-all duration-150 w-full"
                  type="submit"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
        {/* Additional Links */}
        <div className="flex flex-wrap mt-6 relative">
          <div className="w-full text-center">
            <Link href="/auth/login" className="text-gray-800">
                <small>Already have an account?</small>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

RegisterPage.layout = Auth;

export default RegisterPage;
