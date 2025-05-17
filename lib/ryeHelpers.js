// lib/ryeHelpers.js
import axios from 'axios'; // Or use node-fetch if preferred

// ... (RYE_GRAPHQL_ENDPOINT, RYE_SECRET_KEY, RYE_SHOPPER_IP, logApiError, executeGraphQL setup remains the same) ...
const RYE_GRAPHQL_ENDPOINT = process.env.RYE_GRAPHQL_ENDPOINT;
const RYE_SECRET_KEY = process.env.RYE_SECRET_API_KEY;
const RYE_SHOPPER_IP = process.env.RYE_SHOPPER_IP || '127.0.0.1'; // Default placeholder

if (!RYE_SECRET_KEY || !RYE_GRAPHQL_ENDPOINT) {
    console.error("FATAL ERROR: Rye API Key or Endpoint is not configured.");
    // Optional: throw new Error(...) to halt startup
}

// Function to log errors consistently
export function logApiError(error) {
    if (error.response) {
        console.error('Rye API HTTP Error:', {
            status: error.response.status,
            data: typeof error.response.data === 'object' ? JSON.stringify(error.response.data, null, 2) : error.response.data,
            url: error.config?.url,
            method: error.config?.method,
        });
    } else if (error.request) {
        console.error('Rye API No Response Error. Request made to:', error.config?.url);
    } else if (error.errorCode) {
        console.error('Rye API GraphQL/Custom Error:', {
            code: error.errorCode,
            message: error.message,
            details: error.details
        });
    } else {
        console.error('Rye API Setup/Unknown Error:', error.message, error.stack);
    }
}

// Function to execute GraphQL queries/mutations
export async function executeGraphQL(query, variables, req) { // Pass 'req' to access user IP
    console.log(`Executing GraphQL: ${query.split('\n')[0]}... (Variables possibly omitted)`); // Log operation name

    const shopperIp = req?.ip || req?.socket?.remoteAddress || RYE_SHOPPER_IP;

    const headers = {
        'Authorization': `${RYE_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Rye-Shopper-IP': shopperIp
    };

    try {
        const response = await axios.post(RYE_GRAPHQL_ENDPOINT, { query, variables }, { headers });

        if (response.data.errors && response.data.errors.length > 0) {
            console.error("GraphQL Errors received:", JSON.stringify(response.data.errors, null, 2));
            const firstError = response.data.errors[0];
            const errorMessages = response.data.errors.map(e => e.message).join('; ');
            const firstErrorCode = firstError?.extensions?.code || firstError?.code || 'GRAPHQL_ERROR';
            let statusCode = 400;
            if (firstErrorCode?.includes('NOT_FOUND')) statusCode = 404;
            if (firstErrorCode?.includes('UNAUTHENTICATED') || firstErrorCode?.includes('FORBIDDEN')) statusCode = 401;
            if (firstErrorCode === 'CART_EXPIRED_ERROR') statusCode = 410;

            const error = new Error(`GraphQL API Error: ${errorMessages}`);
            error.statusCode = statusCode;
            error.details = response.data.errors;
            error.errorCode = firstErrorCode;
            throw error;
        }
        console.log(`GraphQL Success: ${query.split('\n')[0]}...`);
        return response.data;

    } catch (error) {
        logApiError(error);
        if (error.response) {
            const betterError = new Error(`Rye API HTTP Error: ${error.response.status}`);
            betterError.statusCode = error.response.status;
            try {
                const responseData = typeof error.response.data === 'string' ? JSON.parse(error.response.data) : error.response.data;
                betterError.details = responseData.errors || responseData;
                betterError.errorCode = responseData?.errors?.[0]?.extensions?.code || responseData?.errors?.[0]?.code || `HTTP_${error.response.status}`;
                if (responseData?.errors?.[0]?.message) {
                    betterError.message = `Rye API Error (${error.response.status}): ${responseData.errors[0].message}`;
                }
            } catch {
                betterError.details = error.response.data;
                betterError.errorCode = `HTTP_${error.response.status}`;
            }
            throw betterError;
        } else if (error.request) {
            const noResponseError = new Error('Rye API did not respond');
            noResponseError.statusCode = 504;
            noResponseError.errorCode = 'RYE_TIMEOUT';
            throw noResponseError;
        } else {
            error.statusCode = error.statusCode || 500;
            throw error;
        }
    }
}


export const GET_PRODUCT_BY_ID_QUERY = `
  query GetProductDetails($productId: ID!, $marketplace: Marketplace!) {
    productByID(input: { id: $productId, marketplace: $marketplace }) {
      id
      marketplace
      title
      vendor
      url
      isAvailable # Product level availability
      images { url } # General product images
      price { currency displayValue value } # General product price (e.g., min price for Shopify)
      ... on AmazonProduct {
        ASIN
        # If Amazon products can have selectable "variants" in your system, query them here
        # Amazon treats variants as distinct products, so this might be simpler or handled differently.
        # For now, assuming AmazonProduct variants are not directly queried here unless needed.
      }
      ... on ShopifyProduct {
        # ShopifyProduct can have multiple variants
        variants {
          id          # Common field for Variant interface
          title       # Common field for Variant interface
          image { url } # Common field for Variant interface (assuming ShopifyVariant implements it)
          
          # Fields specific to ShopifyVariant, queried using an inline fragment
          ... on ShopifyVariant {
            isAvailable # Specific to ShopifyVariant
            priceV2 {   # Specific to ShopifyVariant
              value
              currency
              displayValue
            }
            # SKU # If needed
            # option1, option2, option3 # If needed for display
            # quantityAvailable # If needed
          }
        }
      }
    }
  }
`;

export const RYE_CART_QUERY_FIELDS = `
    id
    cost { 
        isEstimated 
        subtotal { displayValue value currency } 
        shipping { displayValue value currency } 
        total { displayValue value currency } 
        tax { displayValue value currency } 
    }
    stores {
      __typename
      ... on AmazonStore {
          store
          offer {
              shippingMethods { id label price { displayValue value currency } }
              selectedShippingMethod { id label price { displayValue value currency } }
              errors { code message }
              notAvailableIds 
          }
          cartLines { 
            quantity 
            product { id title isAvailable images { url } } 
            # attributes { key value } // REMOVED
          }
          errors { code message }
          isSubmitted 
          orderId 
      }
      ... on ShopifyStore {
          store
          offer {
              shippingMethods { id label price { displayValue value currency } }
              selectedShippingMethod { id label price { displayValue value currency } }
              errors { code message }
              notAvailableIds 
          }
          cartLines { 
            quantity 
            variant { 
              id 
              title 
              isAvailable 
              image { url } 
              priceV2 { value currency displayValue } 
            }
            product { id title } 
            # attributes { key value } // REMOVED
          }
          errors { code message }
          isSubmitted 
          orderId 
      }
    }
    buyerIdentity { 
        firstName lastName email address1 address2 
        city provinceCode countryCode postalCode phone 
    }
`;

export const GET_CART_QUERY = `
  query GetCart($cartId: ID!) {
    getCart(id: $cartId) {
      cart { ${RYE_CART_QUERY_FIELDS} }
      errors { code message }
    }
  }
`;

export const CREATE_CART_MUTATION = `
  mutation CreateNewCart($input: CartCreateInput!) {
    createCart(input: $input) {
      cart { ${RYE_CART_QUERY_FIELDS} }
      errors { code message }
    }
  }
`;

export const ADD_CART_ITEMS_MUTATION = `
  mutation AddToCart($input: CartItemsAddInput!) {
    addCartItems(input: $input) {
      cart { ${RYE_CART_QUERY_FIELDS} }
      errors { code message }
    }
  }
`;

export const UPDATE_CART_ITEMS_MUTATION = `
  mutation UpdateCartItemQuantity($input: CartItemsUpdateInput!) {
    updateCartItems(input: $input) {
      cart { ${RYE_CART_QUERY_FIELDS} }
      errors { code message }
    }
  }
`;

export const DELETE_CART_ITEMS_MUTATION = `
  mutation RemoveCartItem($input: CartItemsDeleteInput!) {
    deleteCartItems(input: $input) {
      cart { ${RYE_CART_QUERY_FIELDS} }
      errors { code message }
    }
  }
`;

export const UPDATE_BUYER_IDENTITY_MUTATION = `
  mutation UpdateBI($input: CartBuyerIdentityUpdateInput!) {
    updateCartBuyerIdentity(input: $input) {
      cart { ${RYE_CART_QUERY_FIELDS} }
      errors { code message }
    }
  }
`;

export const UPDATE_SHIPPING_OPTION_MUTATION = `
  mutation UpdateSelectedShipping($input: UpdateCartSelectedShippingOptionsInput!) {
    updateCartSelectedShippingOptions(input: $input) {
      cart { id } 
      errors { code message }
    }
  }
`;

export const SUBMIT_CART_MUTATION = `
  mutation SubmitCartBackend($input: CartSubmitInput!) {
    submitCart(input: $input) {
      cart { 
        id
        stores {
          __typename
          status 
          orderId 
          store { 
            ... on AmazonStore { store }
            ... on ShopifyStore { store }
          }
          errors { 
            code
            message
          }
        }
      }
      errors { 
         code
         message
      }
    }
  }
`;

export const REQUEST_AMAZON_PRODUCT_MUTATION = `
  mutation RequestAmazonProduct($input: RequestAmazonProductByURLInput!) {
    requestAmazonProductByURL(input: $input) {
      productId 
    }
  }
`;

export const REQUEST_SHOPIFY_PRODUCT_MUTATION = `
  mutation RequestShopifyProduct($input: RequestShopifyProductByURLInput!) {
    requestShopifyProductByURL(input: $input) {
      productId 
    }
  }
`;


export const GET_ORDER_DETAILS_QUERY = `
  query GetOrderDetails($orderId: ID!) {
    orderByID(id: $orderId) {
      id
      status
      createdAt
      marketplace
      marketplaceOrderIds
      total { displayValue currency }
      subtotal { displayValue currency }
      tax { displayValue currency }
      shipping { displayValue currency }
      cart {
        id
        attributes {
          key
          value
        }
        buyerIdentity {
          firstName
          lastName
          email
          phone
          address1
          address2
          city
          provinceCode
          countryCode
          postalCode
        }
        stores {
          __typename
          ... on AmazonStore {
            store
            cartLines {
              quantity
              product {
                id
                title
                images { url } 
              }
            }
          }
          ... on ShopifyStore {
            store
            cartLines {
              quantity
              variant {
                id
                title
                SKU
                image { url } 
              }
              product { 
                id
                title
                productType
                images { 
                  url
                }
              }
            }
          }
        }
      }
      shipments {
        carrierName
        carrierTrackingNumber
        carrierTrackingUrl
        status
        expectedDeliveryDate
      }
      returns {
        id
        shippingLabelUrl
        lineItems {
          __typename
          ... on AmazonReturnLineItem { productId quantity status }
          ... on ShopifyReturnLineItem { variantId quantity status }
        }
      }
      events {
        __typename
        id
        createdAt
        ... on OrderFailedOrderEvent { reason reasonCode retryable }
        ... on RefundCreatedOrderEvent { amount { displayValue currency } }
      }
      requiredActions {
        __typename
        ... on CompletePaymentChallenge {
          redirectURL
        }
      }
    }
  }
`;
// ...