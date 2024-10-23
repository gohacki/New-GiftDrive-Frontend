// src/utils/localStorageCart.js

export const getLocalCartItems = () => {
if (typeof window !== 'undefined') {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
}
return [];
};

export const setLocalCartItems = (items) => {
if (typeof window !== 'undefined') {
    localStorage.setItem('cart', JSON.stringify(items));
}
};

export const addLocalCartItem = (item) => {
const cartItems = getLocalCartItems();
cartItems.push(item);
setLocalCartItems(cartItems);
};

export const removeLocalCartItem = (cartItemId) => {
const cartItems = getLocalCartItems();
const updatedCartItems = cartItems.filter(item => item.cart_item_id !== cartItemId);
setLocalCartItems(updatedCartItems);
};