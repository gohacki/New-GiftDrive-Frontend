// pages/auth/verify-email.js
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Auth from 'layouts/Auth.js';
import axios from 'axios';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaPaperPlane } from 'react-icons/fa';
import { toast } from 'react-toastify';

export default function VerifyEmailPage() {
    const router = useRouter();
    const { token, email: emailFromQuery } = router.query; // Capture email if passed for resend

    const [verificationStatus, setVerificationStatus] = useState('verifying');
    const [message, setMessage] = useState('Verifying your email address...');
    const [isResending, setIsResending] = useState(false);
    const [resendEmail, setResendEmail] = useState('');

    useEffect(() => {
        if (emailFromQuery && typeof emailFromQuery === 'string') {
            setResendEmail(emailFromQuery);
        }
    }, [emailFromQuery]);

    useEffect(() => {
        if (router.isReady && token) {
            axios.get(`/api/auth/verify-email?token=${token}`)
                .then(response => {
                    setVerificationStatus('success');
                    setMessage(response.data.message || 'Email verified successfully!');
                    toast.success(response.data.message || 'Email verified successfully!');
                })
                .catch(error => {
                    setVerificationStatus('error');
                    const apiError = error.response?.data?.error || 'Failed to verify email. The link may be invalid or expired.';
                    setMessage(apiError);
                    toast.error(apiError);
                });
        } else if (router.isReady && !token) {
            setVerificationStatus('error');
            setMessage('Verification token is missing. Please use the link from your email, or request a new one if the link has expired.');
        }
    }, [router.isReady, token]);

    const handleResendVerification = async (e) => {
        if (e) e.preventDefault(); // If called from a form submit
        if (!resendEmail) {
            toast.error("Please enter your email address to resend the verification link.");
            return;
        }
        setIsResending(true);
        setMessage('');
        try {
            const response = await axios.post('/api/auth/resend-verification-email', { email: resendEmail });
            setMessage(response.data.message);
            toast.success(response.data.message);
            // Optionally clear the email field or give other feedback
        } catch (error) {
            const apiError = error.response?.data?.error || 'Failed to resend verification email.';
            setMessage(apiError); // Display error message on page
            toast.error(apiError);
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary_green flex items-center justify-center px-4">
            <div className="w-full lg:w-7/12"> {/* Wider for resend form */}
                <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0 py-10 px-6 text-center">
                    {verificationStatus === 'verifying' && (
                        <>
                            <FaSpinner className="text-5xl text-ggreen mx-auto mb-6 animate-spin" />
                            <h1 className="text-2xl font-semibold text-gray-800 mb-2">Verifying Email</h1>
                            <p className="text-gray-600">{message}</p>
                        </>
                    )}
                    {verificationStatus === 'success' && (
                        <>
                            <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-6" />
                            <h1 className="text-2xl font-semibold text-gray-800 mb-2">Email Verified!</h1>
                            <p className="text-gray-600 mb-6">{message}</p>
                            <Link href="/auth/login"
                                className="bg-ggreen text-white font-semibold px-6 py-3 rounded-full shadow hover:shadow-lg transition-all duration-150">
                                Proceed to Login
                            </Link>
                        </>
                    )}
                    {verificationStatus === 'error' && (
                        <>
                            <FaTimesCircle className="text-6xl text-red-500 mx-auto mb-6" />
                            <h1 className="text-2xl font-semibold text-gray-800 mb-2">Verification Failed</h1>
                            <p className="text-red-600 mb-6">{message}</p>

                            <div className="mt-6 border-t pt-6">
                                <p className="text-gray-700 mb-3 text-sm">
                                    If your link has expired or is not working, you can request a new one.
                                </p>
                                <form onSubmit={handleResendVerification} className="flex flex-col sm:flex-row gap-3 items-center justify-center max-w-md mx-auto">
                                    <input
                                        type="email"
                                        value={resendEmail}
                                        onChange={(e) => setResendEmail(e.target.value)}
                                        placeholder="Enter your email address"
                                        required
                                        className="flex-grow border-gray-300 px-3 py-2.5 rounded-md shadow-sm focus:ring-ggreen focus:border-ggreen sm:text-sm w-full sm:w-auto"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isResending || !resendEmail}
                                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-md shadow-sm transition-colors flex items-center justify-center text-sm disabled:opacity-50 w-full sm:w-auto"
                                    >
                                        {isResending ? <FaSpinner className="animate-spin mr-2" /> : <FaPaperPlane className="mr-2" />}
                                        {isResending ? 'Sending...' : 'Resend Link'}
                                    </button>
                                </form>
                                <div className="mt-4">
                                    <Link href="/auth/login" className="text-ggreen hover:underline text-sm">
                                        Back to Login
                                    </Link>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

VerifyEmailPage.layout = Auth;