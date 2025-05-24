// File: pages/admin/editOrgInfo.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Admin from "layouts/Admin.js";
import { toast } from 'react-toastify';
import { FaTrash, FaUserPlus, FaSpinner } from 'react-icons/fa'; // Added icons

const EditOrganizationInfo = () => {
  const { data: session, status: authStatus } = useSession();
  const user = session?.user;
  const authLoading = authStatus === "loading";
  const router = useRouter();

  // State for organization info form
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

  // State for managing organization administrators
  const [orgAdmins, setOrgAdmins] = useState([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [adminManagementError, setAdminManagementError] = useState('');


  const fetchOrganizationInfo = async () => {
    if (!user || !user.org_id) {
      setFetchError('User or Organization ID is missing. Cannot fetch details.');
      setIsFetchingData(false);
      return;
    }
    setIsFetchingData(true);
    setFetchError(null);
    try {
      const response = await axios.get(`/api/organizations/${user.org_id}`, { withCredentials: true });
      const orgData = response.data;
      setOrganization({
        name: orgData.name || '', description: orgData.description || '',
        website_link: orgData.website_link || '', address: orgData.address || '',
        city: orgData.city || '', state: orgData.state || '',
        zip_code: orgData.zip_code || '', country: orgData.country || 'US',
        phone: orgData.phone || '', photo: null, // Photo is for new uploads, not existing
      });
      setCurrentPhotoUrl(orgData.photo || null);
      setPreviewPhoto(null);
    } catch (error) {
      console.error('Error fetching organization info:', error.response?.data || error.message);
      setFetchError('Failed to load organization details.');
      toast.error('Failed to load organization details.');
    } finally {
      setIsFetchingData(false);
    }
  };

  const fetchOrgAdmins = async () => {
    if (!user || !user.org_id) return;
    setIsLoadingAdmins(true);
    setAdminManagementError('');
    try {
      const response = await axios.get(`/api/organizations/${user.org_id}/admins`, { withCredentials: true });
      setOrgAdmins(response.data || []);
    } catch (error) {
      console.error('Error fetching org admins:', error.response?.data || error.message);
      const fetchAdminErrorMsg = error.response?.data?.error || 'Failed to load organization administrators.';
      setAdminManagementError(fetchAdminErrorMsg);
      // toast.error(fetchAdminErrorMsg); // Displaying in dedicated error spot
    } finally {
      setIsLoadingAdmins(false);
    }
  };


  useEffect(() => {
    if (authStatus === "loading") {
      setIsFetchingData(true); // Keep parent fetching data true as well
      return;
    }
    if (authStatus === "unauthenticated") {
      router.push('/auth/login?callbackUrl=/admin/editOrgInfo'); // Redirect to login if not authenticated
      return;
    }
    if (user) {
      if (user.is_org_admin && user.org_id) {
        fetchOrganizationInfo();
        fetchOrgAdmins(); // Also fetch admins
      } else {
        setFetchError('Access Denied. You are not an organization administrator or not associated with an organization.');
        setIsFetchingData(false);
        // router.push('/visible/profile'); // Or a more appropriate page
      }
    } else {
      // This case implies authStatus is 'authenticated' but session.user is null somehow.
      // Should ideally not happen.
      setIsFetchingData(false);
      setFetchError('User session error. Please try logging out and back in.');
    }
    // Cleanup for preview URL
    return () => {
      if (previewPhoto) URL.revokeObjectURL(previewPhoto);
    };
  }, [authStatus, user, router]); // Effect dependencies


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOrganization({ ...organization, [name]: value });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Basic client-side validation
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error("Photo is too large (max 5MB).");
        e.target.value = null; // Clear the input
        return;
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Please select a JPG, PNG, GIF, or WEBP image.");
        e.target.value = null; // Clear the input
        return;
      }
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
    const newErrors = {};
    if (!organization.name || organization.name.trim().length < 3) newErrors.name = 'Name must be at least 3 characters.';
    if (!organization.phone || !/^\+[1-9]\d{1,14}$/.test(organization.phone.trim())) newErrors.phone = 'Valid E.164 phone number is required (e.g., +12125551212).';
    if (!organization.address?.trim()) newErrors.address = "Address is required.";
    if (!organization.city?.trim()) newErrors.city = "City is required.";
    if (!organization.state?.trim()) newErrors.state = "State/Province is required.";
    if (!organization.zip_code?.trim()) newErrors.zip_code = "ZIP/Postal Code is required.";
    if (!organization.country?.trim()) newErrors.country = "Country is required.";
    if (organization.description && organization.description.length > 1000) newErrors.description = 'Description must be under 1000 characters.';
    if (organization.website_link && !/^https?:\/\/.+/.test(organization.website_link)) newErrors.website_link = 'Please enter a valid URL (e.g., https://example.com).';

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
    formData.append('name', organization.name.trim());
    formData.append('description', organization.description.trim());
    formData.append('website_link', organization.website_link.trim());
    formData.append('address', organization.address.trim());
    formData.append('city', organization.city.trim());
    formData.append('state', organization.state.trim());
    formData.append('zip_code', organization.zip_code.trim());
    formData.append('country', organization.country.trim().toUpperCase());
    formData.append('phone', organization.phone.trim());
    if (organization.photo instanceof File) {
      formData.append('photo', organization.photo);
    }

    setIsSubmittingForm(true);
    setErrors(prev => ({ ...prev, form: null })); // Clear previous form-level submit errors
    try {
      await axios.put(
        `/api/organizations/${user.org_id}`,
        formData,
        { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
      );
      toast.success('Organization info updated successfully!');
      fetchOrganizationInfo(); // Refetch to show updated data
    } catch (error) {
      console.error('Error updating organization info:', error.response?.data || error.message);
      const apiError = error.response?.data?.error || 'Failed to update organization.';
      setErrors(prev => ({ ...prev, form: apiError })); // Set form-level error for display
      toast.error(apiError);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleInviteAdmin = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !/\S+@\S+\.\S+/.test(inviteEmail)) { // Simple email format check
      toast.error("Please enter a valid email address to invite.");
      return;
    }
    setIsInviting(true);
    setAdminManagementError('');
    try {
      const response = await axios.post(
        `/api/organizations/${user.org_id}/admins/invite`,
        { email: inviteEmail },
        { withCredentials: true }
      );
      toast.success(response.data.message || "Administrator invited successfully.");
      setInviteEmail('');
      fetchOrgAdmins(); // Refresh list of admins
    } catch (error) {
      console.error('Error inviting admin:', error.response?.data || error.message);
      const inviteErrorMsg = error.response?.data?.error || 'Failed to invite administrator.';
      setAdminManagementError(inviteErrorMsg);
      // toast.error(inviteErrorMsg); // Displaying in dedicated error spot
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveAdmin = async (adminIdToRemove) => {
    if (!user || !user.org_id) return;
    if (user.id === adminIdToRemove) {
      toast.warn("You cannot remove yourself as an administrator here.");
      return;
    }
    if (window.confirm('Are you sure you want to remove this administrator from your organization?')) {
      setIsLoadingAdmins(true); // Use general loading state for admin list operations
      setAdminManagementError('');
      try {
        await axios.delete(`/api/organizations/${user.org_id}/admins/${adminIdToRemove}`, { withCredentials: true });
        toast.success('Administrator removed successfully.');
        fetchOrgAdmins(); // Refresh list
      } catch (error) {
        console.error('Error removing admin:', error.response?.data || error.message);
        const removeErrorMsg = error.response?.data?.error || 'Failed to remove administrator.';
        setAdminManagementError(removeErrorMsg);
        // toast.error(removeErrorMsg); // Displaying in dedicated error spot
      } finally {
        setIsLoadingAdmins(false);
      }
    }
  };


  if (authLoading || isFetchingData) {
    return (
      <Admin>
        <div className="pt-32 p-6 text-center text-gray-700">Loading organization data...</div>
      </Admin>
    );
  }

  if (authStatus === "unauthenticated") {
    // This should be caught by useEffect which redirects, but as a fallback.
    return (
      <Admin>
        <div className="pt-32 p-6 text-center text-red-500">Please log in to continue.</div>
      </Admin>
    );
  }

  if (fetchError && !isSubmittingForm) {
    // This handles cases where user is authenticated but not authorized for org, or other fetch issues
    return (
      <Admin>
        <div className="pt-32 p-6 text-red-500 text-center">{fetchError}</div>
      </Admin>
    );
  }


  // This check is an extra safety net if useEffect hasn't redirected yet,
  // or if state somehow gets inconsistent.
  if (!user || !user.org_id || !user.is_org_admin) {
    return (
      <Admin>
        <div className="pt-32 p-6 text-red-500 text-center">
          Access Denied or organization data is unavailable.
        </div>
      </Admin>
    );
  }


  return (
    <div className="min-h-screen bg-blueGray-100 p-6 pt-12">
      {/* Organization Information Form */}
      <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">
        <div className="rounded-t bg-white mb-0 px-6 py-6">
          <div className="text-center flex justify-between">
            <h6 className="text-blueGray-700 text-xl font-bold">Edit Organization Information</h6>
          </div>
        </div>
        <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
          <form onSubmit={handleSubmit} noValidate>
            {errors.form && <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">{errors.form}</div>}
            <h6 className="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">Organization Details</h6>
            <div className="flex flex-wrap">
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
                  <input type="url" name="website_link" id="website_link" value={organization.website_link} onChange={handleInputChange} className={`input-class ${errors.website_link ? 'border-red-500' : ''}`} placeholder="https://example.com" />
                  {errors.website_link && <p className="text-red-500 text-xs mt-1">{errors.website_link}</p>}
                </div>
              </div>
              <div className="w-full px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="description">Description</label>
                  <textarea name="description" id="description" value={organization.description} onChange={handleInputChange} className={`input-class ${errors.description ? 'border-red-500' : ''}`} placeholder="Organization Description (max 1000 chars)" rows="4" maxLength="1000"></textarea>
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
              <div className="w-full lg:w-6/12 px-4"> {/* City */}
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="city">City <span className="text-red-500">*</span></label>
                  <input type="text" name="city" id="city" value={organization.city} onChange={handleInputChange} className={`input-class ${errors.city ? 'border-red-500' : ''}`} placeholder="New York" required />
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                </div>
              </div>
              <div className="w-full lg:w-6/12 px-4"> {/* State */}
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="state">State/Province <span className="text-red-500">*</span></label>
                  <input type="text" name="state" id="state" value={organization.state} onChange={handleInputChange} className={`input-class ${errors.state ? 'border-red-500' : ''}`} placeholder="NY" required />
                  {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                </div>
              </div>
              <div className="w-full lg:w-4/12 px-4"> {/* Zip */}
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="zip_code">ZIP/Postal Code <span className="text-red-500">*</span></label>
                  <input type="text" name="zip_code" id="zip_code" value={organization.zip_code} onChange={handleInputChange} className={`input-class ${errors.zip_code ? 'border-red-500' : ''}`} placeholder="10001" required />
                  {errors.zip_code && <p className="text-red-500 text-xs mt-1">{errors.zip_code}</p>}
                </div>
              </div>
              <div className="w-full lg:w-4/12 px-4"> {/* Country */}
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="country">Country <span className="text-red-500">*</span></label>
                  <select name="country" id="country" value={organization.country} onChange={handleInputChange} required className={`input-class bg-white ${errors.country ? 'border-red-500' : ''}`}>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    {/* Add more countries as needed */}
                  </select>
                  {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
                </div>
              </div>
              <div className="w-full lg:w-4/12 px-4"> {/* Phone */}
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="phone">
                    Phone <span className="text-red-500">*</span> <span className="text-xs text-gray-500 normal-case">(E.164 format)</span>
                  </label>
                  <input type="tel" name="phone" id="phone" value={organization.phone} onChange={handleInputChange} className={`input-class ${errors.phone ? 'border-red-500' : ''}`} placeholder="+1XXXXXXXXXX" required pattern="\+[0-9]{1,3}[0-9]{9,14}" title="Enter phone in E.164 format, e.g., +12125551212" />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
              </div>
            </div>

            <hr className="mt-6 border-b-1 border-blueGray-300" />
            <h6 className="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">Organization Photo</h6>
            <div className="flex flex-wrap">
              <div className="w-full px-4">
                <div className="relative w-full mb-3">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2" htmlFor="orgPhoto">Upload New Photo (Optional)</label>
                  <input type="file" name="photo" id="orgPhoto" accept="image/*" onChange={handleFileChange} className="input-class file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-ggreen file:text-white hover:file:bg-teal-700" />
                  <div className="mt-4 flex space-x-4 items-start">
                    {currentPhotoUrl && !previewPhoto && (
                      <div>
                        <p className="text-xs text-blueGray-500 mb-1">Current Photo:</p>
                        <Image src={currentPhotoUrl} alt={organization.name || "Current org photo"} width={100} height={100} className="rounded object-cover shadow" />
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
                {isSubmittingForm ? 'Saving Organization Info...' : 'Save Organization Info'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* New Section for Admin Management */}
      <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0 mt-12">
        <div className="rounded-t bg-white mb-0 px-6 py-6">
          <div className="text-center flex justify-between items-center">
            <h6 className="text-blueGray-700 text-xl font-bold">Manage Organization Administrators</h6>
          </div>
        </div>
        <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
          {adminManagementError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">
              {adminManagementError}
            </div>
          )}

          <h6 className="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">Invite New Administrator</h6>
          <form onSubmit={handleInviteAdmin} className="flex flex-col sm:flex-row gap-4 items-end mb-6">
            <div className="flex-grow w-full sm:w-auto">
              <label htmlFor="inviteEmail" className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                User&apos;s Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="inviteEmail"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="input-class w-full"
              />
            </div>
            <button
              type="submit"
              disabled={isInviting}
              className="bg-ggreen text-white active:bg-teal-700 font-bold uppercase text-xs px-5 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none sm:w-auto w-full ease-linear transition-all duration-150 disabled:opacity-50 flex items-center justify-center"
            >
              {isInviting ? <FaSpinner className="animate-spin mr-2" /> : <FaUserPlus className="mr-2" />}
              {isInviting ? 'Inviting...' : 'Invite Admin'}
            </button>
          </form>

          <hr className="mt-6 border-b-1 border-blueGray-300" />
          <h6 className="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">Current Administrators</h6>
          {isLoadingAdmins ? (
            <div className="flex justify-center items-center p-4"><FaSpinner className="animate-spin mr-2 h-5 w-5 text-blueGray-500" /> Loading administrators...</div>
          ) : orgAdmins.length === 0 ? (
            <p className="text-blueGray-500 italic text-center py-4">No additional administrators found for this organization.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="items-center w-full bg-transparent border-collapse">
                <thead>
                  <tr>
                    <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">User</th>
                    <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">Email</th>
                    <th className="px-6 bg-blueGray-50 text-blueGray-500 align-middle border border-solid border-blueGray-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgAdmins.map((admin) => (
                    <tr key={admin.account_id}>
                      <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-left flex items-center">
                        <Image
                          src={admin.profile_picture_url || '/img/default-avatar.svg'}
                          alt={admin.username || admin.email}
                          width={36}
                          height={36}
                          className="h-9 w-9 bg-white rounded-full border object-cover"
                          onError={(e) => { e.currentTarget.src = '/img/default-avatar.svg'; }}
                        />
                        <span className="ml-3 font-bold text-blueGray-600">
                          {admin.username || 'N/A'}
                        </span>
                      </td>
                      <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                        {admin.email}
                      </td>
                      <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                        {user && user.id !== admin.account_id && (
                          <button
                            onClick={() => handleRemoveAdmin(admin.account_id)}
                            className="text-red-500 hover:text-red-700 font-semibold flex items-center disabled:opacity-50"
                            title="Remove Admin"
                            disabled={isLoadingAdmins}
                          >
                            <FaTrash className="mr-1 h-3 w-3" /> Remove
                          </button>
                        )}
                        {user && user.id === admin.account_id && (
                          <span className="text-gray-400 text-xs italic">(You)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>


      <style>{`
        .input-class {
          border-width: 1px; padding: 0.75rem; color: #4a5568; background-color: #fff;
          border-radius: 0.25rem; font-size: 0.875rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          width: 100%; transition: all 0.15s ease-linear;
        }
        .input-class:focus { outline: none; border-color: #11393B; box-shadow: 0 0 0 2px rgba(17, 57, 59, 0.5); } /* Focus style for ggreen */
        .input-class.border-red-500 { border-color: #f56565; }
      `}</style>
    </div>
  );
};

EditOrganizationInfo.layout = Admin;
export default EditOrganizationInfo;