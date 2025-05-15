// पेजेस/विजिबल/contact.js
import React, { useState } from 'react';
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import Auth from 'layouts/Auth.js'; // Using Auth layout for Navbar and Footer consistency

const ContactPage = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        subject: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitMessage('');

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        // In a real app, you would send formData to your backend here
        // For example:
        // try {
        //   const response = await axios.post('/api/contact', formData);
        //   setSubmitMessage('Your message has been sent successfully!');
        //   setFormData({ fullName: '', email: '', subject: '', message: '' });
        // } catch (error) {
        //   setSubmitMessage('Failed to send message. Please try again.');
        // }

        setSubmitMessage(`Thank you, ${formData.fullName}! Your message about "${formData.subject}" has been received. We will contact you at ${formData.email} if a response is needed.`);
        setFormData({ fullName: '', email: '', subject: '', message: '' });
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

                        {submitMessage && (
                            <div className={`mb-6 p-3 rounded-md text-sm ${submitMessage.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {submitMessage}
                            </div>
                        )}

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

ContactPage.layout = Auth; // This ensures Navbar and Footer are applied via the Auth layout

export default ContactPage;