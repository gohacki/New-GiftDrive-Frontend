// पेजेस/विजिबल/contact.js
import React, { useState } from 'react';
import Auth from 'layouts/Auth.js';
import axios from 'axios';
import { toast } from 'react-toastify';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const ContactPage = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        subject: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await axios.post(`${apiUrl}/api/contact`, formData);
            toast.success(response.data.message || 'Your message has been sent successfully!');
            setFormData({ fullName: '', email: '', subject: '', message: '' });
        } catch (error) {
            console.error("Contact form submission error:", error.response?.data || error.message);
            if (error.response && error.response.data && error.response.data.errors) {
                error.response.data.errors.forEach(err => toast.error(err.msg));
            } else {
                toast.error(error.response?.data?.error || 'Failed to send message. Please try again.');
            }
        }
        setIsSubmitting(false);
    };

    return (
        <>
            {/* Navbar and Footer are handled by Auth.layout */}
            <main className="min-h-screen bg-secondary_green text-gray-800 relative pt-20 pb-16">
                <div className="container mx-auto px-4 py-8">
                    {/* Removed bg-white, shadow-lg, rounded-lg from this div. 
                        Padding is kept to maintain spacing. 
                        The max-w-3xl and mx-auto keep it centered and constrained. */}
                    <div className="max-w-3xl mx-auto p-0 md:p-4"> {/* Adjusted padding for better centering of title and form */}
                        <h1 className="text-3xl font-medium text-ggreen mb-6 text-left"> {/* Changed to text-left */}
                            Contact Us
                        </h1>

                        {/* Horizontal line like in the screenshot */}
                        <hr className="-mx-64 mb-8 border-t-1 border-gray-300" /> {/* Adjusted color to be more visible */}


                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="fullName" className="block text-sm font-bold text-gray-700 mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    name="fullName"
                                    id="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full px-3 py-4 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm bg-white"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full px-3 py-4 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm bg-white"
                                />
                            </div>

                            <div>
                                <label htmlFor="subject" className="block text-sm font-bold text-gray-700 mb-1">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    name="subject"
                                    id="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full px-3 py-4 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm bg-white"
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-bold text-gray-700 mb-1">
                                    Message
                                </label>
                                <textarea
                                    name="message"
                                    id="message"
                                    rows="6"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
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

ContactPage.layout = Auth;

export default ContactPage;