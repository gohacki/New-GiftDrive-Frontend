// components/Share/ShareButton.jsx
import React, { useState, useContext } from 'react';
import ShareModal from './ShareModal';
import { FaShareAlt } from 'react-icons/fa';
import { AuthContext } from '../../contexts/AuthContext'; // To check if user is logged in

const ShareButton = ({ pageType, pageData, pageUrl }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { user } = useContext(AuthContext); // Get user to tailor messages if needed

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => setIsModalOpen(false);

    if (!pageData) return null; // Don't render if essential data is missing

    // Generate dynamic share content
    let shareTitle = "Check this out on GiftDrive!";
    let shareText = `Discover more about ${pageData.name || 'this initiative'} and how you can help.`;
    let imageUrlForSocial = pageData.photo || pageData.image_url || `${process.env.NEXT_PUBLIC_FRONTEND_URL}/MainGift.png`; // Fallback OG image

    const orgName = pageData.organization_name || (pageType === 'organization' ? pageData.name : 'our community');

    switch (pageType) {
        case 'organization':
            shareTitle = `Support ${pageData.name || 'our organization'} on GiftDrive`;
            shareText = `${pageData.description ? pageData.description.substring(0, 120) + '...' : ''} Help ${pageData.name || 'us'} make a difference! Visit their page:`;
            imageUrlForSocial = pageData.photo || imageUrlForSocial;
            break;
        case 'drive':
            shareTitle = `Join the '${pageData.name}' drive by ${orgName}!`;
            shareText = `${pageData.description ? pageData.description.substring(0, 120) + '...' : ''} Let's support this cause together. See how you can contribute:`;
            imageUrlForSocial = pageData.photo || imageUrlForSocial;
            break;
        case 'child':
            shareTitle = `Help fulfill a wish for ${pageData.child_name || 'a child in need'}`;
            shareText = `You can make a difference for ${pageData.child_name || 'a child'} through the '${pageData.drive_name || 'donation drive'}'. See their needs:`;
            imageUrlForSocial = pageData.photo || pageData.drive_photo || imageUrlForSocial; // Child photo or fallback
            break;
        default:
            // Default messages already set
            break;
    }

    return (
        <>
            <button
                onClick={handleOpenModal}
                className="px-4 py-2 bg-ggreen text-white font-semibold rounded-full hover:bg-teal-700 transition-colors flex items-center text-sm shadow-md hover:shadow-lg"
                aria-label="Share this page"
            >
                <FaShareAlt className="mr-2" /> Share
            </button>
            {isModalOpen && (
                <ShareModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    title={shareTitle}
                    text={shareText}
                    url={pageUrl}
                    pageData={pageData}
                    pageType={pageType}
                    imageUrlForSocial={imageUrlForSocial}
                />
            )}
        </>
    );
};

export default ShareButton;