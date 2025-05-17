// GiftDrive-Frontend/pages/auth/register.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { signIn, useSession } from 'next-auth/react'; // Import signIn and useSession
import Link from 'next/link';
import Auth from "layouts/Auth.js"; // Your existing layout

// const apiUrl = process.env.NEXT_PUBLIC_API_URL; // No longer needed for direct calls to Express backend

const RegisterPage = () => {
  const { data: session, status: authStatus } = useSession(); // Get session status
  const router = useRouter();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreeToPolicy, setAgreeToPolicy] = useState(false);

  useEffect(() => {
    // Redirect if user is already authenticated
    if (authStatus === "authenticated" && session?.user) {
      router.push('../visible/profile');
    }
  }, [session, authStatus, router]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(''); // Clear error on change
  };

  const handlePolicyChange = (e) => {
    setAgreeToPolicy(e.target.checked);
    setError(''); // Clear error on change
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreeToPolicy) {
      setError('You must agree to the Privacy Policy to register.');
      return;
    }
    if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('All fields (Username, Email, Password) are required.');
      return;
    }


    setIsSubmitting(true);

    try {
      // Step 1: Register the user by calling your new Next.js API route
      // This API route will handle database insertion.
      const registrationResponse = await axios.post('/api/auth/register-user', { // Relative path to your Next.js API
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      // If registration is successful (no error thrown from axios post)
      console.log('Registration API call successful:', registrationResponse.data);

      // Step 2: Sign in the newly registered user using NextAuth's credentials provider
      const signInResult = await signIn('credentials', {
        redirect: false, // Handle success/error manually
        email: formData.email,
        password: formData.password,
        // callbackUrl: '../visible/profile' // You can specify where to go after successful sign-in
      });

      setIsSubmitting(false);

      if (signInResult?.error) {
        // This might happen if there's an issue with the authorize function or if user somehow already exists
        // despite the check in your API route.
        setError(signInResult.error === "CredentialsSignin" ? "Auto-login failed. Please try logging in manually." : signInResult.error);
        console.error('Auto-login after registration failed:', signInResult.error);
        // Consider redirecting to login page if auto-login fails: router.push('/auth/login');
      } else if (signInResult?.ok && !signInResult.error) {
        // Successful sign-in, useEffect will handle redirect when session status updates
        console.log("Registration and auto-login successful, waiting for session update and redirect...");
        // router.push('../visible/profile'); // Or redirect explicitly
      } else if (!signInResult?.ok) {
        setError("Registration successful, but auto-login attempt failed. Please try logging in.");
      }

    } catch (err) {
      setIsSubmitting(false);
      // Error from your /api/auth/register-user endpoint
      const apiErrorMessage = err.response?.data?.message || err.response?.data?.error || 'An error occurred during registration.';
      setError(apiErrorMessage);
      console.error('Registration submission failed:', err.response?.data || err.message || err);
    }
  };

  // Social login buttons are removed as they are on the login page.
  // If you want them on the register page, they would also just call signIn('google') etc.

  if (authStatus === "loading" && !session) {
    return (
      <Auth>
        <div className="min-h-screen bg-secondary_green flex items-center justify-center px-4">
          <p className="text-gray-700 text-lg">Loading...</p>
        </div>
      </Auth>
    );
  }

  return (
    <div className="min-h-screen bg-secondary_green flex items-center justify-center px-4 pt-24">
      <div className="w-full lg:w-6/12 px-4">
        <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">
          <div className="rounded-t mb-0 px-6 py-6">
            {/* Social logins can be here if desired, but often they are on the login page */}
            {/* <hr className="mt-6 border-b-1 border-gray-300" /> */}
            <div className="text-center mb-3">
              <h6 className="text-gray-800 text-xl font-bold font-georgia">
                Create Your Account
              </h6>
            </div>
          </div>
          <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} noValidate>
              <div className="relative w-full mb-3">
                <label className="block uppercase text-gray-800 text-xs font-bold mb-2" htmlFor="username">Username</label>
                <input
                  type="text" name="username" id="username" value={formData.username} onChange={handleChange}
                  className="border-0 px-3 py-3 placeholder-gray-300 text-gray-800 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full transition-all duration-150"
                  placeholder="Username" required autoComplete="username"
                />
              </div>

              <div className="relative w-full mb-3">
                <label className="block uppercase text-gray-800 text-xs font-bold mb-2" htmlFor="email">Email</label>
                <input
                  type="email" name="email" id="email" value={formData.email} onChange={handleChange}
                  className="border-0 px-3 py-3 placeholder-gray-300 text-gray-800 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full transition-all duration-150"
                  placeholder="Email" required autoComplete="email"
                />
              </div>

              <div className="relative w-full mb-3">
                <label className="block uppercase text-gray-800 text-xs font-bold mb-2" htmlFor="password">Password</label>
                <input
                  type="password" name="password" id="password" value={formData.password} onChange={handleChange}
                  className="border-0 px-3 py-3 placeholder-gray-300 text-gray-800 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full transition-all duration-150"
                  placeholder="Password" required autoComplete="new-password"
                />
              </div>

              <div className="relative w-full mb-3">
                <label className="block uppercase text-gray-800 text-xs font-bold mb-2" htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password" name="confirmPassword" id="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                  className="border-0 px-3 py-3 placeholder-gray-300 text-gray-800 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full transition-all duration-150"
                  placeholder="Confirm Password" required autoComplete="new-password"
                />
              </div>

              <div>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    id="customCheckRegister" type="checkbox"
                    checked={agreeToPolicy} onChange={handlePolicyChange}
                    className="form-checkbox border-0 rounded text-gray-800 ml-1 w-5 h-5 transition-all duration-150"
                  // required // HTML5 required might not be enough, validate in JS
                  />
                  <span className="ml-2 text-sm font-semibold text-gray-800">
                    I agree with the{' '}
                    <a href="/privacy-policy" className="text-ggreen" target="_blank" rel="noopener noreferrer"> {/* Link to actual policy */}
                      Privacy Policy
                    </a>
                  </span>
                </label>
              </div>

              <div className="text-center mt-6">
                <button
                  className="bg-ggreen text-white font-semibold uppercase px-6 py-3 rounded-full shadow hover:shadow-lg transition-all duration-150 w-full"
                  type="submit"
                  disabled={isSubmitting || authStatus === "loading"}
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="flex flex-wrap mt-6 relative">
          <div className="w-full text-center">
            <Link href="/auth/login" className="text-gray-800">
              <small>Already have an account? Log In</small>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

RegisterPage.layout = Auth;

export default RegisterPage;