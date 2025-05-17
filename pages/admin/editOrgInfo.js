// File: pages/admin/editOrgInfo.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Admin from "layouts/Admin.js";
import { toast } from 'react-toastify';

// REMOVED: const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const EditOrganizationInfo = () => {
  const { data: session, status: authStatus } = useSession();
  const user = session?.user;
  const authLoading = authStatus === "loading";
  const router = useRouter();

  const [organization, setOrganization] = useState({
    name: '', description: '', website_link: '', photo: null,
    address: '', city: '', state: '', zip_code: '', country: 'US', phone: '',
  });
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const fetchOrganizationInfo = async () => {
    if (!user || !user.org_id) {
      setFetchError('User or Organization ID is missing. Cannot fetch details.');
      setIsFetchingData(false);
      return;
    }
    setIsFetchingData(true);
    setFetchError(null);
    try {
      // UPDATED to relative path
      const response = await axios.get(`/api/organizations/${user.org_id}`, { withCredentials: true });
      const orgData = response.data;
      setOrganization({
        name: orgData.name || '', description: orgData.description || '',
        website_link: orgData.website_link || '', address: orgData.address || '',
        city: orgData.city || '', state: orgData.state || '',
        zip_code: orgData.zip_code || '', country: orgData.country || 'US',
        phone: orgData.phone || '', photo: null,
      });
      setCurrentPhotoUrl(orgData.photo || null);
      setPreviewPhoto(null); // Clear preview when new data is fetched
    } catch (error) {
      console.error('Error fetching organization info:', error.response?.data || error.message);
      setFetchError('Failed to load organization details.');
      toast.error('Failed to load organization details.');
    } finally {
      setIsFetchingData(false);
    }
  };

  useEffect(() => {
    if (authStatus === "loading") {
      setIsFetchingData(true);
      return;
    }
    if (authStatus === "unauthenticated") {
      router.push('/auth/login');
      return;
    }
    if (user) {
      if (user.is_org_admin && user.org_id) {
        fetchOrganizationInfo();
      } else {
        setFetchError('Access Denied. You are not an organization administrator or not associated with an organization.');
        // toast.error('Access Denied.'); // Optionally show toast
        setIsFetchingData(false);
        // router.push('/visible/profile'); // Optional redirect
      }
    } else {
      setIsFetchingData(false);
      setFetchError('User session error.');
    }
    return () => {
      if (previewPhoto) URL.revokeObjectURL(previewPhoto);
    };
  }, [authStatus, user, router]); // Removed previewPhoto from dependencies

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOrganization({ ...organization, [name]: value });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setOrganization({ ...organization, photo: file });
      if (previewPhoto) URL.revokeObjectURL(previewPhoto);
      setPreviewPhoto(URL.createObjectURL(file));
      if (errors.photo) setErrors(prev => ({ ...prev, photo: null }));
    } else {
      setOrganization({ ...organization, photo: null });
      if (previewPhoto) URL.revokeObjectURL(previewPhoto);
      setPreviewPhoto(null);
    }
  };

  const validateForm = () => {
    // ... (validation logic remains the same) ...
    const newErrors = {};
    if (!organization.name || organization.name.trim().length < 3) newErrors.name = 'Name must be at least 3 characters.';
    if (!organization.phone || !/^\+[1-9]\d{1,14}$/.test(organization.phone.trim())) newErrors.phone = 'Valid E.164 phone number is required (e.g., +12125551212).';
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
    if (!user || !user.org_id) {
      toast.error("Cannot submit: User or Organization ID is missing.");
      return;
    }

    const formData = new FormData();
    // ... (appending to formData remains the same) ...
    formData.append('name', organization.name.trim());
    formData.append('description', organization.description.trim());
    formData.append('website_link', organization.website_link.trim());
    formData.append('address', organization.address.trim());
    formData.append('city', organization.city.trim());
    formData.append('state', organization.state.trim());
    formData.append('zip_code', organization.zip_code.trim());
    formData.append('country', organization.country.trim());
    formData.append('phone', organization.phone.trim());
    if (organization.photo instanceof File) {
      formData.append('photo', organization.photo);
    }

    setIsSubmittingForm(true);
    setErrors({}); // Clear previous form-level errors
    try {
      // UPDATED to relative path
      await axios.put(
        `/api/organizations/${user.org_id}`,
        formData,
        { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
      );
      toast.success('Organization info updated successfully!');
      fetchOrganizationInfo(); // Refetch to show updated data and clear file input if it was a new upload
    } catch (error) {
      console.error('Error updating organization info:', error.response?.data || error.message);
      const apiError = error.response?.data?.error || 'Failed to update organization.';
      setErrors(prev => ({ ...prev, form: apiError }));
      toast.error(apiError);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  if (authLoading || isFetchingData) {
    return (
      <Admin> {/* Ensure Admin layout for consistency */}
        <div className="pt-32 p-6 text-center">Loading organization data...</div>
      </Admin>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <Admin>
        <div className="pt-32 p-6 text-center">Redirecting to login...</div>
      </Admin>
    );
  }

  if (fetchError && !isSubmittingForm) {
    return (
      <Admin>
        <div className="pt-32 p-6 text-red-500 text-center">{fetchError}</div>
      </Admin>
    );
  }

  if (!user || !user.org_id || !user.is_org_admin) {
    // This condition should be covered by fetchError or redirection logic in useEffect
    return (
      <Admin>
        <div className="pt-32 p-6 text-red-500 text-center">
          {fetchError || "You are not authorized to edit this organization or organization data is unavailable."}
        </div>
      </Admin>
    );
  }

  return (
    <div className="min-h-screen bg-blueGray-100 p-6 pt-12"> {/* Adjusted pt from pt-32 */}
      <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">
        <div className="rounded-t bg-white mb-0 px-6 py-6">
          <div className="text-center flex justify-between">
            <h6 className="text-blueGray-700 text-xl font-bold">Edit Organization Info</h6>
          </div>
        </div>
        <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
          <form onSubmit={handleSubmit} noValidate>
            {errors.form && <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">{errors.form}</div>}
            <h6 className="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">Organization Information</h6>
            <div className="flex flex-wrap">
              {/* ... (Form fields JSX remains the same, ensure classNames like input-class are defined or use Tailwind directly) ... */}
              <div className="w-full lg:w-6/12 px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="name">Name <span className="text-red-500">*</span></label>
                  <input type="text" name="name" id="name" value={organization.name} onChange={handleInputChange} className={`input-class ${errors.name ? 'border-red-500' : ''}`} placeholder="Organization Name" required />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
              </div>
              <div className="w-full lg:w-6/12 px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="website_link">Website</label>
                  <input type="url" name="website_link" id="website_link" value={organization.website_link} onChange={handleInputChange} className="input-class" placeholder="https://example.com" />
                </div>
              </div>
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
              <div className="w-full lg:w-12/12 px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="address">Address <span className="text-red-500">*</span></label>
                  <input type="text" name="address" id="address" value={organization.address} onChange={handleInputChange} className={`input-class ${errors.address ? 'border-red-500' : ''}`} placeholder="1234 Main St" required />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>
              </div>
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
              <div className="w-full lg:w-6/12 px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="phone">
                    Phone Number <span className="text-red-500">*</span> <span className="text-xs text-gray-500 normal-case">(e.g., +12125551212)</span>
                  </label>
                  <input
                    type="tel" name="phone" id="phone" value={organization.phone} onChange={handleInputChange}
                    className={`input-class ${errors.phone ? 'border-red-500' : ''}`}
                    placeholder="+1XXXXXXXXXX" required pattern="\+[0-9]{1,3}[0-9]{9,14}"
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
                disabled={isSubmittingForm}
                className="bg-ggreen text-white active:bg-teal-700 font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full sm:w-auto ease-linear transition-all duration-150 disabled:opacity-50"
              >
                {isSubmittingForm ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <style>{`
        .input-class {
          border-width: 1px; padding: 0.75rem; color: #4a5568; background-color: #fff;
          border-radius: 0.25rem; font-size: 0.875rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          width: 100%; transition: all 0.15s ease-linear;
        }
        .input-class:focus { outline: none; box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.5); } /* Example focus, adjust color to match ggreen */
        .input-class.border-red-500 { border-color: #f56565; }
      `}</style>
    </div>
  );
};

EditOrganizationInfo.layout = Admin;
export default EditOrganizationInfo;