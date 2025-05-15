// पेजेस/विजिबल/contact.js
import React, { useState } from 'react';
import Auth from 'layouts/Auth.js';
import axios from 'axios'; // <<< IMPORT AXIOS
import { toast } from 'react-toastify'; // <<< IMPORT TOASTIFY for better feedback

const apiUrl = process.env.NEXT_PUBLIC_API_URL; // Ensure you have this for your API base URL

const ContactPage = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        subject: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Removed submitMessage state, will use react-toastify

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Make API call to your backend
            const response = await axios.post(`${apiUrl}/api/contact`, formData); // Use apiUrl
            toast.success(response.data.message || 'Your message has been sent successfully!');
            setFormData({ fullName: '', email: '', subject: '', message: '' }); // Reset form
        } catch (error) {
            console.error("Contact form submission error:", error.response?.data || error.message);
            if (error.response && error.response.data && error.response.data.errors) {
                // Display validation errors
                error.response.data.errors.forEach(err => toast.error(err.msg));
            } else {
                toast.error(error.response?.data?.error || 'Failed to send message. Please try again.');
            }
        }

        setIsSubmitting(false);
    };

    return (
        <>
            <main className="min-h-screen bg-secondary_green text-gray-800 relative pt-20 pb-16">
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 shadow-lg rounded-lg">
                        <h1 className="text-3xl font-semibold text-ggreen mb-8 text-center">
                            Contact Us
                        </h1>

                        {/* react-toastify will handle messages, so no need for submitMessage div here */}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    name="fullName"
                                    id="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    name="subject"
                                    id="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm"
                                    placeholder="Regarding my drive..."
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                                    Message
                                </label>
                                <textarea
                                    name="message"
                                    id="message"
                                    rows="6"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm"
                                    placeholder="Your message here..."
                                ></textarea>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-ggreen hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ggreen disabled:opacity-50"
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