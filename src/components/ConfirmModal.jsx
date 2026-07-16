import React, { createContext, useContext, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import '../styles/ConfirmModal.css';

const ConfirmContext = createContext();

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
};

export const ConfirmProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: 'Confirm Action',
    message: 'Are you sure you want to perform this action?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger', // 'danger' | 'warning' | 'info'
    resolveRef: null
  });

  const confirm = (options = {}) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'danger',
        resolveRef: resolve
      });
    });
  };

  const handleCancel = () => {
    if (modalState.resolveRef) {
      modalState.resolveRef(false);
    }
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    if (modalState.resolveRef) {
      modalState.resolveRef(true);
    }
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {modalState.isOpen && (
        <div className="confirm-modal-overlay" onClick={handleCancel}>
          <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="confirm-modal-close" onClick={handleCancel}>
              <X size={18} />
            </button>
            <div className="confirm-modal-body">
              <div className={`confirm-modal-icon ${modalState.type}`}>
                <AlertTriangle size={24} />
              </div>
              <div className="confirm-modal-content">
                <h3>{modalState.title}</h3>
                <p>{modalState.message}</p>
              </div>
            </div>
            <div className="confirm-modal-actions">
              <button className="btn-confirm-cancel" onClick={handleCancel}>
                {modalState.cancelText}
              </button>
              <button className={`btn-confirm-submit ${modalState.type}`} onClick={handleConfirm}>
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
