// pages/auth/reset-password.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Auth from 'layouts/Auth.js';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function ResetPasswordPage() {
    const router = useRouter();
    const { token } = router.query;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isValidToken, setIsValidToken] = useState(null); // null: checking, true: valid, false: invalid

    // Basic token presence check (more robust validation happens on API side)
    useEffect(() => {
        if (router.isReady) {
            if (!token) {
                setError('Invalid or missing password reset token. Please request a new one.');
                setIsValidToken(false);
                // router.push('/auth/forgot-password'); // Optionally redirect immediately
            } else {
                // You could do a quick client-side check here if you had an API endpoint for it,
                // but the main validation will be when the form is submitted.
                setIsValidToken(true); // Assume valid for now, API will confirm
            }
        }
    }, [router.isReady, token, router]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        if (!token) {
            setError('Reset token is missing. Please use the link from your email.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axios.post('/api/auth/reset-password', { token, password });
            setMessage(response.data.message);
            toast.success(response.data.message);
            setPassword('');
            setConfirmPassword('');
            // Redirect to login page after a short delay
            setTimeout(() => {
                router.push('/auth/login');
            }, 3000);
        } catch (err) {
            const apiError = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to reset password. The token might be invalid or expired.';
            setError(apiError);
            toast.error(apiError);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isValidToken === null && router.isReady) { // Checking token or router not ready
        return (
            <div className="min-h-screen bg-secondary_green flex items-center justify-center px-4">
                <p className="text-gray-700">Verifying link...</p>
            </div>
        );
    }
    if (isValidToken === false) {
        return (
            <div className="min-h-screen bg-secondary_green flex flex-col items-center justify-center px-4 text-center">
                <h1 className="text-xl font-semibold text-red-600 mb-4">Invalid or Expired Link</h1>
                <p className="text-gray-700 mb-6">The password reset link is invalid or has expired. Please request a new one.</p>
                <Link href="/auth/forgot-password"
                    className="bg-ggreen text-white font-semibold px-6 py-3 rounded-full shadow hover:shadow-lg transition-all duration-150">
                    Request New Reset Link
                </Link>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-secondary_green flex items-center justify-center px-4">
            <div className="w-full lg:w-5/12">
                <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">
                    <div className="rounded-t mb-0 px-6 py-6">
                        <div className="text-center mb-3">
                            <h6 className="text-gray-800 text-xl font-bold font-georgia">
                                Reset Your Password
                            </h6>
                            <p className="text-gray-600 text-sm mt-2">
                                Enter your new password below.
                            </p>
                        </div>
                    </div>
                    <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
                        {message && (
                            <div className="text-center mb-4 px-3 py-3 bg-green-100 text-green-700 text-sm rounded">
                                <p>{message}</p>
                            </div>
                        )}
                        {error && (
                            <div className="text-center mb-4 px-3 py-3 bg-red-100 text-red-700 text-sm rounded">
                                <p>{error}</p>
                            </div>
                        )}
                        {!message && ( // Only show form if no success message
                            <form onSubmit={handleSubmit}>
                                <div className="relative w-full mb-3">
                                    <label className="block uppercase text-gray-800 text-xs font-bold mb-2" htmlFor="password">
                                        New Password
                                    </label>
                                    <input
                                        type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                        className="border-0 px-3 py-3 placeholder-gray-300 text-gray-800 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full transition-all duration-150"
                                        placeholder="New Password" required autoComplete="new-password"
                                    />
                                </div>
                                <div className="relative w-full mb-3">
                                    <label className="block uppercase text-gray-800 text-xs font-bold mb-2" htmlFor="confirmPassword">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="border-0 px-3 py-3 placeholder-gray-300 text-gray-800 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full transition-all duration-150"
                                        placeholder="Confirm New Password" required autoComplete="new-password"
                                    />
                                </div>
                                <div className="text-center mt-6">
                                    <button
                                        className="bg-ggreen text-white font-semibold uppercase px-6 py-3 rounded-full shadow hover:shadow-lg transition-all duration-150 w-full"
                                        type="submit"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                </div>
                            </form>
                        )}
                        {message && ( // Show login link if password reset was successful
                            <div className="text-center mt-6">
                                <Link href="/auth/login" className="text-ggreen hover:underline">
                                    Proceed to Login
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

ResetPasswordPage.layout = Auth;