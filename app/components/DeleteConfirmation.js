'use client';

import { FaTimesCircle } from 'react-icons/fa';

export default function DeleteConfirmation({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Remove Item",
  itemName,
  description,
  confirmText = "Yes, Remove",
  cancelText = "Cancel"
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm mx-auto p-6 transform transition-all duration-300">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <FaTimesCircle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
          <div className="bg-red-50 rounded-2xl p-4 mb-6">
            <p className="text-gray-700 font-medium">
              {description || `Are you sure you want to remove `}
              <span className="font-bold text-red-600 text-lg"> {itemName} </span>
              {description ? '' : '?'}
            </p>
            <p className="text-xs text-gray-500 mt-2">⚠️ This action cannot be undone</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 bg-red-600 text-white rounded-2xl py-3 font-bold hover:bg-red-700 transition-all transform hover:scale-105 shadow-lg"
            >
              {confirmText}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 rounded-2xl py-3 font-bold hover:bg-gray-300 transition-colors"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
