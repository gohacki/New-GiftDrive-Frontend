// ModalRenderer.js
import React from 'react';
import { useModal, MODAL_TYPES } from '../../contexts/ModalContext';
import AddChildModal from './AddChildModal';
import EditChildModal from './EditChildModal';
import AddDriveModal from './AddDriveModal';
import EditDriveModal from './EditDriveModal';

const ModalRenderer = () => {
  const { modalState, closeModal } = useModal();

  if (!modalState.isOpen || !modalState.modalType) {
    return null;
  }

  const { modalType, modalProps } = modalState;

  switch (modalType) {
    case MODAL_TYPES.ADD_CHILD:
      return <AddChildModal onClose={closeModal} {...modalProps} />;
    case MODAL_TYPES.EDIT_CHILD:
      return <EditChildModal onClose={closeModal} {...modalProps} />;
    case MODAL_TYPES.ADD_DRIVE:
      return <AddDriveModal onClose={closeModal} {...modalProps} />;
    case MODAL_TYPES.EDIT_DRIVE:
      return <EditDriveModal onClose={closeModal} {...modalProps} />;
    default:
      return null;
  }
};

export default ModalRenderer;
