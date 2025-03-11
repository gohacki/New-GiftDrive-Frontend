// pages/register-org.js

import React, { useState, useContext } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Auth from 'layouts/Auth.js';
import { AuthContext } from 'contexts/AuthContext';

const RegisterOrganization = () => {
  const router = useRouter();
  const { user, loading } = useContext(AuthContext);
  
  // If the user is already an org admin, redirect to drive setup
  if (!loading && user && user.is_org_admin) {
    router.push('visible/registerdrive');
  }

  const [orgData, setOrgData] = useState({
    orgName: '',
    orgEmail: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    preferredDropOffTime: '',
    contactPhone: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setOrgData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    // Build payload to match your backend expectations
    const payload = {
      name: orgData.orgName,
      description: '', // Add if you want an optional description
      address: orgData.streetAddress,
      city: orgData.city,
      state: orgData.state,
      zip_code: orgData.zipCode,
      website_link: '', // Optional if available
      // You might also send orgEmail, preferredDropOffTime, and contactPhone if needed.
    };

    try {
      // Post to the organization registration endpoint
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/register`, payload, {
        withCredentials: true,
      });
      // On success, redirect to the drive setup page
      router.push('/registerdrive');
    } catch (err) {
      console.error('Error registering organization:', err);
      alert('Failed to register organization. Please check your input and try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">Register Your Organization</h2>
      <div className="space-y-4">
        <input
          type="text"
          name="orgName"
          value={orgData.orgName}
          onChange={handleChange}
          placeholder="Organization Name"
          className="border px-3 py-2 w-full"
        />
        <input
          type="email"
          name="orgEmail"
          value={orgData.orgEmail}
          onChange={handleChange}
          placeholder="Organization Email"
          className="border px-3 py-2 w-full"
        />
        <input
          type="text"
          name="streetAddress"
          value={orgData.streetAddress}
          onChange={handleChange}
          placeholder="Street Address"
          className="border px-3 py-2 w-full"
        />
        <div className="flex space-x-4">
          <input
            type="text"
            name="city"
            value={orgData.city}
            onChange={handleChange}
            placeholder="City"
            className="border px-3 py-2 w-full"
          />
          <input
            type="text"
            name="state"
            value={orgData.state}
            onChange={handleChange}
            placeholder="State"
            className="border px-3 py-2 w-full"
          />
        </div>
        <input
          type="text"
          name="zipCode"
          value={orgData.zipCode}
          onChange={handleChange}
          placeholder="Zip Code"
          className="border px-3 py-2 w-full"
        />
        {/* Optionally, include fields for preferredDropOffTime and contactPhone */}
      </div>
      <button
        onClick={handleSubmit}
        className="mt-6 bg-teal-700 text-white px-4 py-2 rounded hover:bg-teal-800"
      >
        Register Organization
      </button>
    </div>
  );
};

RegisterOrganization.layout = Auth;
export default RegisterOrganization;
