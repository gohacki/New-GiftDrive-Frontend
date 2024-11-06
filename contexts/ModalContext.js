import React, { createContext, useState, useContext } from 'react';
import PropTypes from 'prop-types';

// Define modal types
export const MODAL_TYPES = {
  ADD_CHILD: 'ADD_CHILD',
  EDIT_CHILD: 'EDIT_CHILD',
  ADD_DRIVE: 'ADD_DRIVE',
  EDIT_DRIVE: 'EDIT_DRIVE',
  ITEM_SELECTION: 'ITEM_SELECTION',
  // Add more modal types as needed
};

// Create the context
const ModalContext = createContext();

// Custom hook for easy access to the ModalContext
export const useModal = () => useContext(ModalContext);

// ModalProvider component
export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    modalType: null,
    modalProps: {},
  });

  const openModal = (modalType, modalProps = {}) => {
    setModalState({
      isOpen: true,
      modalType,
      modalProps,
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      modalType: null,
      modalProps: {},
    });
  };

  return (
    <ModalContext.Provider value={{ modalState, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
};

ModalProvider.propTypes = {
  children: PropTypes.node.isRequired,
};