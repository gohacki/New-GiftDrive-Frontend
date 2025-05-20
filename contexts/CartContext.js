// contexts/CartContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid'; // For temporary optimistic item IDs

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true); // True initially to fetch cart
  const { status: authStatus } = useSession();

  const fetchCart = useCallback(async () => {
    console.log("CartContext: fetchCart called. Auth status:", authStatus);
    if (authStatus === "loading") {
      setLoading(true);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`/api/cart`, { withCredentials: true });
      setCart(response.data || null);
      console.log("CartContext: Cart data fetched/updated:", response.data);
    } catch (error) {
      console.error('CartContext: Error fetching cart:', error.response?.data || error.message);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [authStatus]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const resetCart = useCallback(() => {
    setCart(null);
    console.log("CartContext: Cart reset locally.");
  }, []);

  const addToCart = async (itemDisplayInfo, apiPayload) => {
    // itemDisplayInfo: { name, image, priceInCents, currency, base_item_name, variant_display_name, base_item_photo, variant_display_photo, base_item_price, variant_display_price, base_rye_product_id, base_marketplace_store_domain (for Shopify) ... }
    // apiPayload: { ryeIdToAdd, marketplaceForItem, quantity, originalNeedRefId, originalNeedRefType }

    const originalCart = cart ? JSON.parse(JSON.stringify(cart)) : null; // Deep clone for rollback
    const optimisticCartLineId = `optimistic-${uuidv4()}`;

    // --- Optimistic UI Update ---
    setCart(prevCart => {
      let newCart = prevCart ? JSON.parse(JSON.stringify(prevCart)) : { stores: [], cost: null, buyerIdentity: null, id: `temp-${uuidv4()}` };
      if (!newCart.stores) newCart.stores = [];

      const marketplaceKey = apiPayload.marketplaceForItem.toUpperCase();
      let storeIdentifier = marketplaceKey === "AMAZON" ? "amazon" : (itemDisplayInfo.base_marketplace_store_domain || marketplaceKey);

      let storeIndex = newCart.stores.findIndex(s => s.store === storeIdentifier && s.__typename === (marketplaceKey === "AMAZON" ? "AmazonStore" : "ShopifyStore"));

      if (storeIndex === -1) {
        newCart.stores.push({
          __typename: marketplaceKey === "AMAZON" ? "AmazonStore" : "ShopifyStore",
          store: storeIdentifier,
          cartLines: [],
          offer: { shippingMethods: [], selectedShippingMethod: null, errors: [], notAvailableIds: [] },
          errors: [],
          isSubmitted: false,
          orderId: null
        });
        storeIndex = newCart.stores.length - 1;
      }

      const displayPrice = itemDisplayInfo.variant_display_price ?? itemDisplayInfo.base_item_price ?? 0;
      const priceInCents = Math.round(displayPrice * 100);
      const currencyCode = itemDisplayInfo.currency || 'USD'; // Assume USD if not specified

      const optimisticCartLine = {
        quantity: apiPayload.quantity,
        isOptimistic: true,
        optimisticId: optimisticCartLineId, // Use this as key if needed
        giftdrive_base_product_name: itemDisplayInfo.base_item_name,
        giftdrive_variant_details_text: itemDisplayInfo.variant_display_name || itemDisplayInfo.base_item_name,
        giftdrive_display_photo: itemDisplayInfo.variant_display_photo || itemDisplayInfo.base_item_photo,
        giftdrive_display_price: displayPrice,
        giftdrive_source_drive_item_id: apiPayload.originalNeedRefType === 'drive_item' ? apiPayload.originalNeedRefId : null,
        giftdrive_source_child_item_id: apiPayload.originalNeedRefType === 'child_item' ? apiPayload.originalNeedRefId : null,
      };

      if (marketplaceKey === 'AMAZON') {
        optimisticCartLine.product = {
          id: apiPayload.ryeIdToAdd, // This is the ASIN for Amazon
          title: itemDisplayInfo.base_item_name,
          images: itemDisplayInfo.base_item_photo ? [{ url: itemDisplayInfo.base_item_photo }] : [],
          price: { value: priceInCents, currency: currencyCode, displayValue: `$${(priceInCents / 100).toFixed(2)}` }
        };
      } else { // SHOPIFY
        optimisticCartLine.variant = {
          id: apiPayload.ryeIdToAdd, // This is the Shopify Variant ID
          title: itemDisplayInfo.variant_display_name || itemDisplayInfo.base_item_name,
          image: itemDisplayInfo.variant_display_photo ? { url: itemDisplayInfo.variant_display_photo } : null,
          priceV2: { value: priceInCents, currency: currencyCode, displayValue: `$${(priceInCents / 100).toFixed(2)}` }
        };
        optimisticCartLine.product = { // Basic parent product info
          id: itemDisplayInfo.base_rye_product_id || `parent-${apiPayload.ryeIdToAdd}`,
          title: itemDisplayInfo.base_item_name
        };
      }
      newCart.stores[storeIndex].cartLines.push(optimisticCartLine);

      // Optimistically update subtotal and total (basic)
      if (priceInCents != null) {
        if (!newCart.cost) newCart.cost = { isEstimated: true, subtotal: { value: 0, currency: currencyCode, displayValue: '$0.00' }, total: { value: 0, currency: currencyCode, displayValue: '$0.00' }, tax: null, shipping: null };
        if (!newCart.cost.subtotal) newCart.cost.subtotal = { value: 0, currency: currencyCode, displayValue: '$0.00' };
        if (!newCart.cost.total) newCart.cost.total = { value: 0, currency: currencyCode, displayValue: '$0.00' };

        newCart.cost.subtotal.value += (priceInCents * apiPayload.quantity);
        newCart.cost.subtotal.displayValue = `$${(newCart.cost.subtotal.value / 100).toFixed(2)}`;
        newCart.cost.isEstimated = true; // Likely estimated until full Rye recalc

        newCart.cost.total.value += (priceInCents * apiPayload.quantity);
        newCart.cost.total.displayValue = `$${(newCart.cost.total.value / 100).toFixed(2)}`;
      }
      return newCart;
    });
    // --- End Optimistic UI Update ---

    setLoading(true); // Indicate background activity
    try {
      const response = await axios.post(`/api/cart/add`, apiPayload, { withCredentials: true });
      setCart(response.data); // Set the authoritative cart from backend
      toast.success(`${itemDisplayInfo.name || 'Item'} added to cart!`);
      return true;
    } catch (error) {
      console.error('CartContext: Error adding to cart:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || `Failed to add ${itemDisplayInfo.name || 'item'} to cart.`);
      setCart(originalCart); // Rollback on error
      // Optionally, fetch authoritative cart state again if rollback is too simple
      // await fetchCart(); 
      throw error; // Re-throw so calling component can know about the failure
    } finally {
      setLoading(false);
    }
  };

  // Keep removeFromCart and updateCartItemQuantity as they were for now
  // Optimistic updates for these can be added later if needed, following a similar pattern.
  const removeFromCart = async (ryeItemId, marketplace) => {
    // ... (original implementation) ...
    setLoading(true);
    try {
      const response = await axios.post(
        `/api/cart/remove`,
        { itemId: ryeItemId, marketplace },
        { withCredentials: true }
      );
      const updatedCart = response.data;
      const isEmpty = !updatedCart?.stores || updatedCart.stores.every(s => !s.cartLines || s.cartLines.length === 0);
      setCart(isEmpty ? null : updatedCart);
      toast.success('Item removed from cart.');
    } catch (error) {
      console.error('CartContext: Error removing from cart:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to remove item from cart.');
      await fetchCart();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateCartItemQuantity = async (ryeItemId, marketplace, quantity) => {
    // ... (original implementation) ...
    if (quantity <= 0) {
      try {
        await removeFromCart(ryeItemId, marketplace);
      } catch { /* Error already handled by removeFromCart */ }
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `/api/cart/update`,
        { itemId: ryeItemId, marketplace, quantity },
        { withCredentials: true }
      );
      setCart(response.data);
    } catch (error) {
      console.error('CartContext: Error updating quantity:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to update item quantity.');
      await fetchCart();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      setCart,
      addToCart,
      removeFromCart,
      updateCartItemQuantity,
      loading,
      fetchCart,
      resetCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

CartProvider.propTypes = {
  children: PropTypes.node.isRequired,
};