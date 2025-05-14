// components/Share/ShareModal.jsx
import React from 'react';
import { FaTwitter, FaFacebookF, FaEnvelope, FaFilePdf, FaSms, FaCopy, FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import PropTypes from 'prop-types';

const generatePdfFlyer = (pageType, pageData, url) => {
    const doc = new jsPDF();
    let yPos = 20;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    const title = pageData?.name || (pageType === 'child' ? pageData?.child_name : 'Support Our Cause!');
    const titleLines = doc.splitTextToSize(title, pageW - margin * 2);
    doc.text(titleLines, pageW / 2, yPos, { align: 'center' });
    yPos += titleLines.length * 8 + 5;

    // Sub-context
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    if (pageType === 'drive') {
        doc.text(`Drive by: ${pageData?.organization_name || 'Our Organization'}`, margin, yPos);
        yPos += 7;
        if (pageData?.start_date && pageData?.end_date) {
            doc.text(`Dates: ${new Date(pageData.start_date).toLocaleDateString()} - ${new Date(pageData.end_date).toLocaleDateString()}`, margin, yPos);
            yPos += 7;
        }
    } else if (pageType === 'child') {
        doc.text(`Associated with: ${pageData?.drive_name || 'Donation Drive'} by ${pageData?.organization_name || 'Our Organization'}`, margin, yPos);
        yPos += 7;
    }
    yPos += 5;

    // Description
    if (pageData?.description) {
        const descLines = doc.splitTextToSize(pageData.description, pageW - margin * 2);
        doc.text(descLines, margin, yPos);
        yPos += descLines.length * 5 + 8;
    } else if (pageType === 'child') {
        doc.text(`Help us provide essential items for ${pageData?.child_name || 'a child in need'}. Every contribution makes a difference.`, margin, yPos);
        yPos += 15;
    }

    // Call to Action & Link
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('How to Help:', margin, yPos);
    yPos += 8;

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(41, 128, 185); // Blue color for link
    doc.textWithLink('Visit our page to contribute:', margin, yPos, { url });
    yPos += 10;
    doc.setTextColor(0, 0, 0); // Reset color

    // Footer (Optional)
    doc.setFontSize(9);
    doc.text(`Powered by GiftDrive.org - ${url}`, margin, pageH - margin + 5);

    doc.save(`${pageType}_${(pageData?.name || pageData?.child_name || 'flyer').replace(/\s+/g, '_')}.pdf`);
    toast.success("Flyer PDF downloading!");
};

const ShareModal = ({ isOpen, onClose, title, text, url, pageData, pageType }) => {
    if (!isOpen) return null;

    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedTextAndUrl = encodeURIComponent(`${text}\n${url}`);

    const shareOptions = [
        { name: 'X (Twitter)', icon: <FaTwitter />, action: () => window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(title + ": " + text)}`, '_blank') },
        { name: 'Facebook', icon: <FaFacebookF />, action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}"e=${encodedTextAndUrl}`, '_blank') },
        { name: 'Email', icon: <FaEnvelope />, action: () => { window.location.href = `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(text + '\n\nFind out more: ' + url)}`; } },
        { name: 'WhatsApp', icon: <FaWhatsapp />, action: () => window.open(`https://api.whatsapp.com/send?text=${encodedTextAndUrl}`, '_blank') },
        { name: 'SMS / Text', icon: <FaSms />, action: () => { window.location.href = `sms:?body=${encodeURIComponent(title + ' - ' + text + '\n' + url)}`; } },
        { name: 'Copy Link', icon: <FaCopy />, action: () => { navigator.clipboard.writeText(url).then(() => toast.success('Link copied!')).catch(() => toast.error('Failed to copy.')); } },
        { name: 'Download Flyer', icon: <FaFilePdf />, action: () => generatePdfFlyer(pageType, pageData, url) },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg transform transition-all duration-300 ease-out" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-semibold text-ggreen">Share this {pageType}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl">×</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {shareOptions.map((option) => (
                        <button
                            key={option.name}
                            onClick={option.action}
                            className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ggreen focus:ring-opacity-50 group"
                            aria-label={`Share via ${option.name}`}
                        >
                            <span className="text-3xl text-ggreen mb-2 group-hover:scale-110 transition-transform">{option.icon}</span>
                            <span className="text-xs text-center text-gray-700 font-medium">{option.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
ShareModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    pageData: PropTypes.shape({
        name: PropTypes.string,
        child_name: PropTypes.string,
        organization_name: PropTypes.string,
        start_date: PropTypes.string,
        end_date: PropTypes.string,
        description: PropTypes.string,
    }).isRequired,
    pageType: PropTypes.string.isRequired,
    imageUrlForSocial: PropTypes.string,
};

export default ShareModal;