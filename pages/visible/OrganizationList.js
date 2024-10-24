import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from 'components/Navbars/AuthNavbar.js';
import Footer from 'components/Footers/Footer.js';
import OrganizationCard from 'components/Cards/OrganizationCard';
import { useRouter } from 'next/router'; // For navigation

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function HomePage() {
  const [organizations, setOrganizations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    router.push(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
  };

  useEffect(() => {
    const fetchFeaturedOrganizations = async () => {
      try {
        const response = await axios.get(`${apiUrl}/api/organizations/featured`);
        setOrganizations(response.data);
      } catch (error) {
        console.error('Error fetching featured organizations:', error);
      }
    };

    fetchFeaturedOrganizations();
  }, []);

  return (
    <>
      <Navbar transparent />
      <main className="org-list-page">
        <section className="relative block h-500-px">
          <div className="relative h-500-px flex items-center justify-center">
            <span
              id="blackOverlay"
              className="w-full h-full absolute opacity-50 bg-black"
            ></span>
            <form onSubmit={handleSearch} className="md:flex hidden flex-row flex-wrap lg:ml-auto mr-3">
              <span className="z-10 h-full leading-snug font-normal text-center text-blueGray-300 bg-transparent rounded text-base items-center justify-center w-8 pl-3 py-3">
                <i className="fas fa-search"></i>
              </span>
              <input
                type="text"
                placeholder="Find your cause..."
                className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 relative bg-white bg-white rounded text-sm shadow outline-none focus:outline-none focus:ring w-full pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>
          <div
            className="top-auto bottom-0 left-0 right-0 w-full absolute pointer-events-none overflow-hidden h-16"
            style={{ transform: 'translateZ(0)' }}
          >
            <svg
              className="absolute bottom-0 overflow-hidden"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
              version="1.1"
              viewBox="0 0 2560 100"
              x="0"
              y="0"
            >
              <polygon
                className="text-blueGray-200 fill-current"
                points="2560 0 2560 100 0 100"
              ></polygon>
            </svg>
          </div>
        </section>
        <section className="relative py-16 bg-blueGray-200">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.map((org) => (
                <OrganizationCard key={org.org_id} org={org} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

// import React, { useEffect, useState } from 'react';
// import axios from 'axios';
// import OrganizationCard from '../../components/cards/OrganizationCard';
// import { useRouter } from 'next/router'; // For navigation

// const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// const HomePage = () => {
//   const [organizations, setOrganizations] = useState([]);
//   const [searchQuery, setSearchQuery] = useState('');
//   const router = useRouter();

//   const handleSearch = (e) => {
//     e.preventDefault();
//     // Redirect to search results page, even if search query is empty
//     router.push(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
//   };
  

//   useEffect(() => {
//     const fetchFeaturedOrganizations = async () => {
//       try {
//         const response = await axios.get(`${apiUrl}/api/organizations/featured`);
//         setOrganizations(response.data);
//       } catch (error) {
//         console.error('Error fetching featured organizations:', error);
//       }
//     };

//     fetchFeaturedOrganizations();
//   }, []);

//   return (
//     <div className="org-list-page">
//       <h1>Featured Organizations</h1>
//       {/* Search Form */}
//       <form onSubmit={handleSearch} className="search-form">
//         <input
//           type="text"
//           placeholder="Find your cause..."
//           className="search"
//           value={searchQuery}
//           onChange={(e) => setSearchQuery(e.target.value)} // Update search query state
//         />
//         <button type="submit" className="search-btn">Search</button>
//       </form>
//       <div className="org-list">
//         {organizations.map((org) => (
//           <OrganizationCard key={org.org_id} org={org} />
//         ))}
//       </div>
//     </div>
//   );
// };

// export default HomePage;