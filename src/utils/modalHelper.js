/**
 * Utility to handle click-outside (backdrop click) on modals/drawers safely,
 * preventing them from closing when a user selects text inside the modal
 * and releases the mouse click outside.
 * 
 * Usage:
 * <div className="modal-overlay" {...handleBackdropClick(() => setShowModal(false))}>
 */
export const handleBackdropClick = (closeFn) => {
  return {
    onMouseDown: (e) => {
      if (e.target === e.currentTarget) {
        e.currentTarget.setAttribute('data-mousedown-overlay', 'true');
      } else {
        e.currentTarget.removeAttribute('data-mousedown-overlay');
      }
    },
    onMouseUp: (e) => {
      if (
        e.target === e.currentTarget &&
        e.currentTarget.getAttribute('data-mousedown-overlay') === 'true'
      ) {
        closeFn();
      }
      e.currentTarget.removeAttribute('data-mousedown-overlay');
    }
  };
};
