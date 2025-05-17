// File: pages/visible/contact.js
import React, { useState } from 'react';
import Auth from 'layouts/Auth.js'; // Assuming this layout includes Navbar and Footer
import axios from 'axios';
import { toast } from 'react-toastify';

// REMOVED: const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const ContactPage = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        subject: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Removed local error state in favor of toasts for immediate feedback

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Basic client-side validation (can be enhanced)
        if (!formData.fullName || !formData.email || !formData.subject || !formData.message) {
            toast.error("Please fill in all required fields.");
            setIsSubmitting(false);
            return;
        }
        if (formData.message.length < 10) {
            toast.error("Message must be at least 10 characters long.");
            setIsSubmitting(false);
            return;
        }


        try {
            // UPDATED to relative path
            const response = await axios.post(`/api/contact`, formData); // No withCredentials needed if it's a public contact form
            toast.success(response.data.message || 'Your message has been sent successfully!');
            setFormData({ fullName: '', email: '', subject: '', message: '' }); // Reset form
        } catch (error) {
            console.error("Contact form submission error:", error.response?.data || error.message);
            if (error.response && error.response.data && error.response.data.errors) {
                // If express-validator errors are sent back in an array
                error.response.data.errors.forEach(err => toast.error(err.msg));
            } else {
                toast.error(error.response?.data?.error || 'Failed to send message. Please try again.');
            }
        } finally { // Ensure isSubmitting is reset regardless of outcome
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Navbar and Footer are handled by Auth.layout if this page uses it.
                If not, you'd include <Navbar /> and <Footer /> here.
                Assuming Auth.layout applies them. */}
            <main className="min-h-screen bg-secondary_green text-gray-800 relative pt-20 pb-16">
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-3xl mx-auto p-0 md:p-4">
                        <h1 className="text-3xl font-medium text-ggreen mb-6 text-left">
                            Contact Us
                        </h1>
                        <hr className="mb-8 border-t-1 border-gray-300" /> {/* Adjusted to be full width relative to container */}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="fullName" className="block text-sm font-bold text-gray-700 mb-1">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text" name="fullName" id="fullName"
                                    value={formData.fullName} onChange={handleChange} required
                                    className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm bg-white"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-1">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email" name="email" id="email"
                                    value={formData.email} onChange={handleChange} required
                                    className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm bg-white"
                                />
                            </div>

                            <div>
                                <label htmlFor="subject" className="block text-sm font-bold text-gray-700 mb-1">
                                    Subject <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text" name="subject" id="subject"
                                    value={formData.subject} onChange={handleChange} required
                                    className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm bg-white"
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-bold text-gray-700 mb-1">
                                    Message <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    name="message" id="message" rows="6"
                                    value={formData.message} onChange={handleChange} required
                                    minLength="10" // HTML5 validation
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm bg-white"
                                ></textarea>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-ggreen hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ggreen disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Sending...' : 'Send Message'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </>
    );
};

ContactPage.layout = Auth; // This applies the Auth layout which includes Navbar and Footer

export default ContactPage;