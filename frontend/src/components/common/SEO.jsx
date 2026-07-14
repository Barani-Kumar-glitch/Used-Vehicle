import React from 'react';
import { Helmet } from 'react-helmet-async';

export const SEO = ({
  title,
  description,
  canonicalUrl,
  ogImage,
  ogType = 'website',
  schemaData = null
}) => {
  const defaultTitle = 'SV PreOwned | Buy & Rent Used Cars';
  const defaultDesc = 'Buy inspected secondhand cars, rent vehicles, or hire verified drivers. Earn commissions by referring friends.';
  
  const currentTitle = title ? `${title} | SV PreOwned` : defaultTitle;
  const currentDesc = description || defaultDesc;
  const currentCanonical = canonicalUrl || window.location.href;
  
  // Clean ref params from canonical to avoid duplicate-content issues
  const cleanCanonical = currentCanonical.split('?')[0];

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{currentTitle}</title>
      <meta name="description" content={currentDesc} />
      <link rel="canonical" href={cleanCanonical} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={currentTitle} />
      <meta property="og:description" content={currentDesc} />
      <meta property="og:url" content={cleanCanonical} />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={currentTitle} />
      <meta name="twitter:description" content={currentDesc} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {/* JSON-LD Structured Data Schema */}
      {schemaData && (
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      )}
    </Helmet>
  );
};

// JSON-LD Schema Generator Helpers
export const getAutoDealerSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'AutoDealer',
  'name': 'SV PreOwned Vehicles',
  'image': 'https://domain.com/logo.png',
  'telephone': '+919876543210',
  'address': {
    '@type': 'PostalAddress',
    'streetAddress': 'Mount Road',
    'addressLocality': 'Chennai',
    'addressRegion': 'Tamil Nadu',
    'postalCode': '600002',
    'addressCountry': 'IN'
  },
  'priceRange': '₹₹₹',
  'openingHoursSpecification': {
    '@type': 'OpeningHoursSpecification',
    'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    'opens': '09:00',
    'closes': '19:00'
  }
});

export const getCarProductSchema = (vehicle, price) => {
  if (!vehicle) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    'image': vehicle.photo_url || '',
    'description': `Verified secondhand ${vehicle.year} ${vehicle.make} ${vehicle.model} available for sale in ${vehicle.location}.`,
    'offers': {
      '@type': 'Offer',
      'price': price || '0',
      'priceCurrency': 'INR',
      'availability': vehicle.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'seller': {
        '@type': 'AutoDealer',
        'name': 'SV PreOwned Vehicles'
      }
    }
  };
};
