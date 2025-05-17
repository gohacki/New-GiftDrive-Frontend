// File: pages/visible/registerorg.js
import React, { useState, useEffect } from 'react'; // Removed useContext
import { useRouter } from 'next/router';
import axios from 'axios';
import Auth from 'layouts/Auth.js';
// import { AuthContext } from 'contexts/AuthContext'; // REMOVE THIS LINE
import { useSession } from 'next-auth/react'; // ADD useSession and signOut
import { toast } from 'react-toastify'; // For user feedback

// REMOVED: const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const RegisterOrganization = () => {
  const router = useRouter();
  // const { user, loading: authLoading, setUser } = useContext(AuthContext); // REMOVE THIS LINE
  const { data: session, status: authStatus, update: updateSession } = useSession(); // USE useSession hook
  const user = session?.user;
  const authLoading = authStatus === "loading";

  const [orgData, setOrgData] = useState({
    orgName: '', orgWebsite: '', orgDescription: '',
    streetAddress: '', city: '', state: '', zipCode: '',
    phone: '', country: 'US', // Added country with default
    orgPhoto: null,
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // For submission loading state

  useEffect(() => {
    if (authStatus === "loading") return; // Wait for session to load

    if (authStatus === "unauthenticated") {
      router.push('/auth/login?callbackUrl=/visible/registerorg'); // Redirect with callback
    } else if (user && user.is_org_admin && user.org_id) {
      toast.info("You are already associated with an organization.");
      router.push('/admin/dashboard');
    }
  }, [user, authStatus, router]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'orgPhoto') {
      const file = files[0];
      setOrgData((prev) => ({ ...prev, orgPhoto: file }));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(file ? URL.createObjectURL(file) : null);
    } else {
      setOrgData((prev) => ({ ...prev, [name]: value }));
    }
    setFormError('');
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!orgData.orgName || !orgData.phone || !orgData.streetAddress || !orgData.city || !orgData.state || !orgData.zipCode || !orgData.country) {
      setFormError('Please fill in all required fields: Name, Phone, and Full Address (including Country).');
      toast.error('Please fill in all required fields.');
      return;
    }
    if (!/^\+[1-9]\d{1,14}$/.test(orgData.phone.trim())) {
      setFormError('Invalid phone number format. Please use E.164 (e.g., +12125551212).');
      toast.error('Invalid phone number format for organization.');
      return;
    }


    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('name', orgData.orgName);
    formData.append('description', orgData.orgDescription);
    formData.append('address', orgData.streetAddress);
    formData.append('city', orgData.city);
    formData.append('state', orgData.state);
    formData.append('zip_code', orgData.zipCode);
    formData.append('website_link', orgData.orgWebsite);
    formData.append('phone', orgData.phone.trim());
    formData.append('country', orgData.country.trim().toUpperCase());
    if (orgData.orgPhoto) {
      formData.append('photo', orgData.orgPhoto);
    }

    try {
      // UPDATED to relative path
      const response = await axios.post(
        `/api/organizations/register`, // This API route will handle creating the org and updating the user
        formData,
        { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } }
      );

      toast.success(response.data.message || 'Organization registered successfully!');

      // Crucially, update the session to reflect the new user roles/org_id
      // This tells NextAuth to refetch the session, which will include the updated user info
      // from your database after the /api/organizations/register call modifies the 'accounts' table.
      await updateSession(); // This will trigger the jwt and session callbacks in [...nextauth].js

      // Wait a moment for session to potentially update before redirecting,
      // or rely on next page's auth check.
      setTimeout(() => {
        router.push('/visible/registerdrive'); // Or '/admin/dashboard'
      }, 500);

    } catch (err) {
      console.error('Error registering organization:', err.response?.data || err.message);
      const apiError = err.response?.data?.error || 'Failed to register organization. Please try again.';
      setFormError(apiError);
      toast.error(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    // ... (validation logic remains similar, ensure required fields for each step are checked) ...
    setFormError(''); // Clear previous step errors
    if (currentStep === 1 && (!orgData.orgName.trim() || !orgData.orgDescription.trim() /* || !orgData.orgWebsite.trim() */)) { // Website can be optional
      setFormError('Please fill in Organization Name and Description.');
      toast.error('Organization Name and Description are required for this step.');
      return;
    }
    if (currentStep === 2 && (!orgData.streetAddress.trim() || !orgData.city.trim() || !orgData.state.trim() || !orgData.zipCode.trim() || !orgData.phone.trim() || !orgData.country.trim())) {
      setFormError('Please fill in all address fields, including Phone and Country.');
      toast.error('Full address, Phone, and Country are required for this step.');
      return;
    }
    if (currentStep === 2 && !/^\+[1-9]\d{1,14}$/.test(orgData.phone.trim())) {
      setFormError('Invalid phone number format. Please use E.164 (e.g., +12125551212).');
      toast.error('Invalid phone number format for organization.');
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => { /* ... (remains the same) ... */
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const renderStep = () => {
    // ... (renderStep switch case JSX remains largely the same) ...
    // Just ensure field names match `orgData` state and add the country field.
    switch (currentStep) {
      case 1: // Organization Details
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Step 1: Organization Details</h2>
            <div>
              <label htmlFor="orgName" className="block text-sm font-medium text-gray-700">Organization Name <span className="text-red-500">*</span></label>
              <input type="text" name="orgName" id="orgName" value={orgData.orgName} onChange={handleChange} placeholder="e.g. The Giving Tree Foundation" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm" />
            </div>
            <div>
              <label htmlFor="orgWebsite" className="block text-sm font-medium text-gray-700">Organization Website</label>
              <input type="url" name="orgWebsite" id="orgWebsite" value={orgData.orgWebsite} onChange={handleChange} placeholder="https://example.org" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm" />
            </div>
            <div>
              <label htmlFor="orgDescription" className="block text-sm font-medium text-gray-700">Description <span className="text-red-500">*</span></label>
              <textarea name="orgDescription" id="orgDescription" value={orgData.orgDescription} onChange={handleChange} rows="3" placeholder="A brief description of your organization's mission." required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm"></textarea>
            </div>
          </div>
        );
      case 2: // Address and Phone
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Step 2: Contact Information</h2>
            <div>
              <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700">Street Address <span className="text-red-500">*</span></label>
              <input type="text" name="streetAddress" id="streetAddress" value={orgData.streetAddress} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">City <span className="text-red-500">*</span></label>
                <input type="text" name="city" id="city" value={orgData.city} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm" />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">State/Province <span className="text-red-500">*</span></label>
                <input type="text" name="state" id="state" value={orgData.state} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">ZIP/Postal Code <span className="text-red-500">*</span></label>
                <input type="text" name="zipCode" id="zipCode" value={orgData.zipCode} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm" />
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700">Country <span className="text-red-500">*</span></label>
                <select name="country" id="country" value={orgData.country} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm bg-white">
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  {/* Add more countries as needed */}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number <span className="text-red-500">*</span> <span className="text-xs text-gray-500">(e.g., +12125551212)</span>
              </label>
              <input type="tel" name="phone" id="phone" value={orgData.phone} onChange={handleChange} placeholder="+1XXXXXXXXXX" required pattern="\+[0-9]{1,3}[0-9]{9,14}" title="Enter phone in E.164 format, e.g., +12125551212" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-ggreen focus:border-ggreen sm:text-sm" />
            </div>
          </div>
        );
      case 3: // Photo Upload
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Step 3: Organization Photo (Optional)</h2>
            {previewUrl ? (
              <div className="mb-4 flex justify-center">
                <img src={previewUrl} alt="Preview" className="max-h-48 rounded shadow-md" />
              </div>
            ) : (
              <div className="mb-4 border-2 border-dashed border-gray-300 p-6 rounded text-center text-gray-500">
                Upload a logo or photo for your organization.
              </div>
            )}
            <div className="flex justify-center">
              <input type="file" name="orgPhoto" onChange={handleChange} accept="image/*" className="hidden" id="orgPhotoInput" />
              <label htmlFor="orgPhotoInput" className="cursor-pointer inline-block bg-ggreen text-white px-6 py-3 rounded-full hover:bg-teal-700 transition-colors">
                {orgData.orgPhoto ? "Change Photo" : "Choose Photo"}
              </label>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">Loading...</div>
    );
  }
  // If user is defined but not an org admin yet, allow them to see the form.
  // If user is already an org_admin, useEffect will redirect.

  return (
    <div className="container mx-auto px-4 min-h-screen flex flex-col items-center justify-center pt-10 pb-20">
      <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-xl">
        {formError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">
            {formError}
          </div>
        )}
        {renderStep()}

        <div className="mt-12">
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div style={{ width: `${Math.round(progressPercentage)}%` }} className="bg-ggreen h-2.5 rounded-full transition-all duration-300 ease-out"></div>
          </div>
          <p className="text-center text-sm text-gray-500">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        <div className="mt-8 flex justify-between">
          {currentStep > 1 ? (
            <button onClick={prevStep} className="border-2 border-ggreen text-ggreen px-8 py-3 rounded-full hover:bg-ggreen hover:text-white transition-colors font-semibold" disabled={isSubmitting}>
              Back
            </button>
          ) : <div className="w-auto"></div> /* Placeholder for alignment */}
          <button
            onClick={nextStep}
            className="border-2 border-ggreen bg-ggreen text-white px-8 py-3 rounded-full hover:bg-teal-700 transition-colors font-semibold disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : (currentStep === totalSteps ? 'Register Organization' : 'Next')}
          </button>
        </div>
      </div>
    </div>
  );
};

RegisterOrganization.layout = Auth;
export default RegisterOrganization;