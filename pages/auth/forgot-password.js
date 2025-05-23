// pages/auth/forgot-password.js
import React, { useState } from 'react';
import Link from 'next/link';
import Auth from 'layouts/Auth.js';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsSubmitting(true);

        if (!email) {
            setError('Please enter your email address.');
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await axios.post('/api/auth/request-password-reset', { email });
            setMessage(response.data.message);
            toast.success(response.data.message);
            setEmail(''); // Clear email field on success
        } catch (err) {
            const apiError = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to send reset link. Please try again.';
            setError(apiError);
            toast.error(apiError);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary_green flex items-center justify-center px-4">
            <div className="w-full lg:w-5/12">
                <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">
                    <div className="rounded-t mb-0 px-6 py-6">
                        <div className="text-center mb-3">
                            <h6 className="text-gray-800 text-xl font-bold font-georgia">
                                Forgot Your Password?
                            </h6>
                            <p className="text-gray-600 text-sm mt-2">
                                No worries! Enter your email address below and we&apos;ll send you a link to reset your password.
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
                        {!message && (
                            <form onSubmit={handleSubmit}>
                                <div className="relative w-full mb-3">
                                    <label className="block uppercase text-gray-800 text-xs font-bold mb-2" htmlFor="email">
                                        Email Address
                                    </label>
                                    <input
                                        type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="border-0 px-3 py-3 placeholder-gray-300 text-gray-800 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full transition-all duration-150"
                                        placeholder="Enter your email" required autoComplete="email"
                                    />
                                </div>
                                <div className="text-center mt-6">
                                    <button
                                        className="bg-ggreen text-white font-semibold uppercase px-6 py-3 rounded-full shadow hover:shadow-lg transition-all duration-150 w-full"
                                        type="submit"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                                    </button>
                                </div>
                            </form>
                        )}
                        <div className="text-center mt-6">
                            <Link href="/auth/login" className="text-gray-800 hover:text-ggreen">
                                <small>Back to Login</small>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

ForgotPassword.layout = Auth;