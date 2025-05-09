// pages/admin/editOrgInfo.js
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
// import PropTypes from 'prop-types'; // Not strictly needed if not validating props for this page itself
import { AuthContext } from '../../contexts/AuthContext';
import Image from 'next/image';
import Admin from "layouts/Admin.js";
import { toast } from 'react-toastify';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const EditOrganizationInfo = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [organization, setOrganization] = useState({
    name: '',
    description: '',
    website_link: '', // Ensure this matches backend expected field name
    photo: null,      // This will hold the new file if selected
    address: '',
    city: '',
    state: '', // Make sure this matches backend (e.g., state vs provinceCode)
    zip_code: '',
    country: '', // Add if your backend expects/stores this
    phone: '',   // <<< NEW FIELD
  });
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(null); // To display existing photo
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (user && user.org_id) {
      fetchOrganizationInfo();
    }
    return () => {
      if (previewPhoto) URL.revokeObjectURL(previewPhoto);
    };
  }, [user]); // Removed previewPhoto from dependency array here

  const fetchOrganizationInfo = async () => {
    setIsSubmitting(true);
    setFetchError(null);
    try {
      const response = await axios.get(`${apiUrl}/api/organizations/${user.org_id}`, { withCredentials: true });
      const orgData = response.data;
      setOrganization({
        name: orgData.name || '',
        description: orgData.description || '',
        website_link: orgData.website_link || '',
        address: orgData.address || '',
        city: orgData.city || '',
        state: orgData.state || '',
        zip_code: orgData.zip_code || '',
        country: orgData.country || 'US', // Default if not present
        phone: orgData.phone || '', // <<< SET PHONE
        photo: null, // Reset file input field
      });
      setCurrentPhotoUrl(orgData.photo || null);
      setPreviewPhoto(null); // Clear any previous preview
    } catch (error) {
      console.error('Error fetching organization info:', error.response?.data || error);
      setFetchError('Failed to load organization details.');
      toast.error('Failed to load organization details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOrganization({ ...organization, [name]: value });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null })); // Clear specific error on change
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setOrganization({ ...organization, photo: file });
    if (previewPhoto) URL.revokeObjectURL(previewPhoto); // Clean up previous
    setPreviewPhoto(file ? URL.createObjectURL(file) : null);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!organization.name || organization.name.trim().length < 3) newErrors.name = 'Name must be at least 3 characters.';
    if (!organization.phone || !/^\+[1-9]\d{1,14}$/.test(organization.phone.trim())) newErrors.phone = 'Valid E.164 phone number is required (e.g., +12125551212).';
    // Add other validations for address, city, state, zip_code if they are mandatory
    if (!organization.address?.trim()) newErrors.address = "Address is required.";
    if (!organization.city?.trim()) newErrors.city = "City is required.";
    if (!organization.state?.trim()) newErrors.state = "State/Province is required.";
    if (!organization.zip_code?.trim()) newErrors.zip_code = "ZIP/Postal Code is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please correct the errors in the form.");
      return;
    }

    const formData = new FormData();
    formData.append('name', organization.name.trim());
    formData.append('description', organization.description.trim());
    formData.append('website_link', organization.website_link.trim());
    formData.append('address', organization.address.trim());
    formData.append('city', organization.city.trim());
    formData.append('state', organization.state.trim());
    formData.append('zip_code', organization.zip_code.trim());
    formData.append('country', organization.country.trim());
    formData.append('phone', organization.phone.trim()); // <<< ADD PHONE
    if (organization.photo instanceof File) { // Only append if a new file is selected
      formData.append('photo', organization.photo);
    }

    setIsSubmitting(true);
    try {
      await axios.put(
        `${apiUrl}/api/organizations/${user.org_id}`,
        formData,
        { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
      );
      toast.success('Organization info updated successfully!');
      fetchOrganizationInfo(); // Refetch to show updated data and clear file input
    } catch (error) {
      console.error('Error updating organization info:', error.response?.data || error);
      const apiError = error.response?.data?.error || 'Failed to update organization.';
      setErrors(prev => ({ ...prev, form: apiError }));
      toast.error(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) return <div className="pt-32 p-6">Loading user data...</div>;
  if (!user || !user.org_id) return <div className="pt-32 p-6">Organization not found or user not authorized.</div>;
  if (fetchError) return <div className="pt-32 p-6 text-red-500">{fetchError}</div>;


  return (
    <div className="min-h-screen bg-blueGray-100 p-6 pt-32">
      <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">
        <div className="rounded-t bg-white mb-0 px-6 py-6">
          <div className="text-center flex justify-between">
            <h6 className="text-blueGray-700 text-xl font-bold">Edit Organization Info</h6>
            {/* Optional: Cancel button, adjust as needed */}
          </div>
        </div>
        <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
          <form onSubmit={handleSubmit} noValidate>
            {errors.form && <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">{errors.form}</div>}
            {/* Organization Information */}
            <h6 className="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">Organization Information</h6>
            <div className="flex flex-wrap">
              {/* Name */}
              <div className="w-full lg:w-6/12 px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="name">Name <span className="text-red-500">*</span></label>
                  <input type="text" name="name" id="name" value={organization.name} onChange={handleInputChange} className={`input-class ${errors.name ? 'border-red-500' : ''}`} placeholder="Organization Name" required />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
              </div>
              {/* Website */}
              <div className="w-full lg:w-6/12 px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="website_link">Website</label>
                  <input type="url" name="website_link" id="website_link" value={organization.website_link} onChange={handleInputChange} className="input-class" placeholder="https://example.com" />
                </div>
              </div>
              {/* Description */}
              <div className="w-full px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="description">Description</label>
                  <textarea name="description" id="description" value={organization.description} onChange={handleInputChange} className={`input-class ${errors.description ? 'border-red-500' : ''}`} placeholder="Organization Description" rows="4"></textarea>
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                </div>
              </div>
            </div>

            <hr className="mt-6 border-b-1 border-blueGray-300" />
            <h6 className="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">Contact Information</h6>
            <div className="flex flex-wrap">
              {/* Address */}
              <div className="w-full lg:w-12/12 px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="address">Address <span className="text-red-500">*</span></label>
                  <input type="text" name="address" id="address" value={organization.address} onChange={handleInputChange} className={`input-class ${errors.address ? 'border-red-500' : ''}`} placeholder="1234 Main St" required />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>
              </div>
              {/* City, State, Zip */}
              <div className="w-full lg:w-4/12 px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="city">City <span className="text-red-500">*</span></label>
                  <input type="text" name="city" id="city" value={organization.city} onChange={handleInputChange} className={`input-class ${errors.city ? 'border-red-500' : ''}`} placeholder="New York" required />
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                </div>
              </div>
              <div className="w-full lg:w-4/12 px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="state">State/Province <span className="text-red-500">*</span></label>
                  <input type="text" name="state" id="state" value={organization.state} onChange={handleInputChange} className={`input-class ${errors.state ? 'border-red-500' : ''}`} placeholder="NY" required />
                  {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                </div>
              </div>
              <div className="w-full lg:w-4/12 px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="zip_code">ZIP/Postal Code <span className="text-red-500">*</span></label>
                  <input type="text" name="zip_code" id="zip_code" value={organization.zip_code} onChange={handleInputChange} className={`input-class ${errors.zip_code ? 'border-red-500' : ''}`} placeholder="10001" required />
                  {errors.zip_code && <p className="text-red-500 text-xs mt-1">{errors.zip_code}</p>}
                </div>
              </div>
              {/* Phone Number */}
              <div className="w-full lg:w-6/12 px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="phone">
                    Phone Number <span className="text-red-500">*</span> <span className="text-xs text-gray-500 normal-case">(e.g., +12125551212)</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={organization.phone}
                    onChange={handleInputChange}
                    className={`input-class ${errors.phone ? 'border-red-500' : ''}`}
                    placeholder="+1XXXXXXXXXX"
                    required
                    pattern="\+[0-9]{1,3}[0-9]{9,14}"
                    title="Enter phone in E.164 format, e.g., +12125551212"
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
              </div>
            </div>

            <hr className="mt-6 border-b-1 border-blueGray-300" />
            <h6 className="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">Organization Photo</h6>
            <div className="flex flex-wrap">
              <div className="w-full px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="orgPhoto">Upload New Photo</label>
                  <input type="file" name="photo" id="orgPhoto" accept="image/*" onChange={handleFileChange} className="input-class file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-ggreen file:text-white hover:file:bg-teal-700" />
                  <div className="mt-4 flex items-center space-x-4">
                    {currentPhotoUrl && !previewPhoto && (
                      <div>
                        <p className="text-xs text-blueGray-500 mb-1">Current Photo:</p>
                        <Image src={currentPhotoUrl} alt="Current Org Photo" width={100} height={100} className="rounded object-cover shadow" />
                      </div>
                    )}
                    {previewPhoto && (
                      <div>
                        <p className="text-xs text-blueGray-500 mb-1">New Photo Preview:</p>
                        <Image src={previewPhoto} alt="New Org Photo Preview" width={100} height={100} className="rounded object-cover shadow" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <hr className="mt-6 border-b-1 border-blueGray-300" />
            <div className="text-center mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-ggreen text-white active:bg-teal-700 font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full sm:w-auto ease-linear transition-all duration-150 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <style>{`
        .input-class {
          border-width: 1px; /* Tailwind default border is 1px, so explicit for clarity */
          padding: 0.75rem; /* py-3 */
          padding-left: 0.75rem; /* px-3 */
          padding-right: 0.75rem; /* px-3 */
          color: #4a5568; /* text-blueGray-600 */
          background-color: #fff; /* bg-white */
          border-radius: 0.25rem; /* rounded */
          font-size: 0.875rem; /* text-sm */
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); /* shadow */
          width: 100%;
          transition: all 0.15s ease-linear;
        }
        .input-class:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.5); /* Example focus ring, adjust as needed */
        }
        .input-class.border-red-500 {
            border-color: #f56565; /* Tailwind red-500 */
        }
      `}</style>
    </div>
  );
};

EditOrganizationInfo.layout = Admin;
export default EditOrganizationInfo;