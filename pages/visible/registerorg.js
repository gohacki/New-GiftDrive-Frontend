// pages/registerorganization.js

import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import Auth from 'layouts/Auth.js';
import { AuthContext } from '../../contexts/AuthContext';
import axios from 'axios';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

const libraries = ['places'];

const RegisterOrganization = () => {
  const { user, setUser } = useContext(AuthContext);
  const router = useRouter();

  const [organizationData, setOrganizationData] = useState({
    name: '',
    description: '',
    photo: null,
    address: '',
    city: '',
    state: '',
    zip_code: '',
    website_link: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_API_KEY,
    libraries,
  });

  const [autocomplete, setAutocomplete] = useState(null);

  useEffect(() => {
    if (!user) {
      router.push('../auth/login');
    } else if (user.is_org_admin) {
      router.push('../admin/dashboard');
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOrganizationData({ ...organizationData, [name]: value });
  };

  const handleFileChange = (e) => {
    setOrganizationData({ ...organizationData, photo: e.target.files[0] });
  };

  const onAutocompleteLoad = (autocompleteInstance) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      let streetAddress = '';
      let city = '';
      let state = '';
      let zip = '';

      place.address_components.forEach((component) => {
        const types = component.types;

        if (types.includes('street_number')) {
          streetAddress = component.long_name;
        }

        if (types.includes('route')) {
          streetAddress += ` ${component.long_name}`;
        }

        if (types.includes('locality')) {
          city = component.long_name;
        }

        if (types.includes('administrative_area_level_1')) {
          state = component.short_name;
        }

        if (types.includes('postal_code')) {
          zip = component.long_name;
        }
      });

      setOrganizationData({
        ...organizationData,
        address: streetAddress.trim(),
        city,
        state,
        zip_code: zip,
      });
    }
  };

  const validateForm = () => {
    const errors = [];

    if (organizationData.name.length < 3) {
      errors.push('Organization name must be at least 3 characters.');
    }

    if (organizationData.zip_code && !/^\d{5}$/.test(organizationData.zip_code)) {
      errors.push('Zip code must be exactly 5 digits.');
    }

    if (
      organizationData.website_link &&
      !/^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/.test(organizationData.website_link)
    ) {
      errors.push('Please enter a valid website URL.');
    }

    if (errors.length > 0) {
      setErrorMessage(errors.join(' '));
      return false;
    }

    setErrorMessage('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', organizationData.name);
      formData.append('description', organizationData.description);
      if (organizationData.photo) {
        formData.append('photo', organizationData.photo);
      }
      formData.append('address', organizationData.address);
      formData.append('city', organizationData.city);
      formData.append('state', organizationData.state);
      formData.append('zip_code', organizationData.zip_code);
      formData.append('website_link', organizationData.website_link);

      const response = await axios.post(`${apiUrl}/api/organizations/register`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUser({ ...user, org_id: response.data.org_id, is_org_admin: true });
      router.push('/organizationdashboard');
    } catch (error) {
      console.error('Error registering organization:', error);
      setErrorMessage(error.response?.data?.error || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-xl">Loading...</p>
    </div>
  );

  return (
    <div className="container mx-auto px-4 h-full">
      <div className="flex content-center items-center justify-center h-full">
        <div className="w-full lg:w-6/12 px-4">
          <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-200 border-0">
            <div className="rounded-t mb-0 px-6 py-6">
              <div className="text-center mb-3">
                <h6 className="text-blueGray-500 text-sm font-bold">
                  Register Your Organization
                </h6>
              </div>
              {errorMessage && (
                <div className="text-center mb-3">
                  <p className="text-red-500 text-sm">{errorMessage}</p>
                </div>
              )}
              <hr className="mt-6 border-b-1 border-blueGray-300" />
            </div>
            <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
              <form onSubmit={handleSubmit} encType="multipart/form-data" noValidate>
                {/* Organization Name */}
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="name"
                  >
                    Organization Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={organizationData.name}
                    onChange={handleInputChange}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder="Organization Name"
                    required
                  />
                </div>

                {/* Description */}
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="description"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={organizationData.description}
                    onChange={handleInputChange}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder="Describe your organization"
                    rows="4"
                  ></textarea>
                </div>

                {/* Photo Upload */}
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="photo"
                  >
                    Upload Photo
                  </label>
                  <input
                    type="file"
                    id="photo"
                    name="photo"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  />
                </div>

                {/* Address with Autocomplete */}
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="address"
                  >
                    Address
                  </label>
                  <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={organizationData.address}
                      onChange={handleInputChange}
                      className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                      placeholder="Enter street address"
                      required
                    />
                  </Autocomplete>
                </div>

                {/* City */}
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="city"
                  >
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={organizationData.city}
                    onChange={handleInputChange}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder="City"
                    required
                  />
                </div>

                {/* State */}
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="state"
                  >
                    State
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={organizationData.state}
                    onChange={handleInputChange}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder="State"
                    required
                  />
                </div>

                {/* Zip Code */}
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="zip_code"
                  >
                    Zip Code
                  </label>
                  <input
                    type="text"
                    id="zip_code"
                    name="zip_code"
                    value={organizationData.zip_code}
                    onChange={handleInputChange}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder="Zip Code"
                    required
                  />
                </div>

                {/* Website Link */}
                <div className="relative w-full mb-3">
                  <label
                    className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                    htmlFor="website_link"
                  >
                    Website Link
                  </label>
                  <input
                    type="text"
                    id="website_link"
                    name="website_link"
                    value={organizationData.website_link}
                    onChange={handleInputChange}
                    className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    placeholder="https://yourorganization.com"
                  />
                </div>

                {/* Submit Button */}
                <div className="text-center mt-6">
                  <button
                    className="bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full ease-linear transition-all duration-150"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Registering...' : 'Register Organization'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Assign the Auth layout to this page
RegisterOrganization.layout = Auth;

export default RegisterOrganization;