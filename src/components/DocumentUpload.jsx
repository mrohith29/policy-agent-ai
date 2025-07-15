import React, { useState } from 'react';
import { FileText } from 'lucide-react';

// Unified DocumentUpload component
// - Requires conversationId prop to upload
// - Calls backend on port 8080
// - Provides user feedback (uploading, error, success)
// - Calls onDocumentParsed(text, filename) on success
const DocumentUpload = ({ onDocumentParsed, conversationId }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Handles file selection and upload
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setError('No file selected.');
      return;
    }
    if (!conversationId) {
      setError('No conversation selected.');
      return;
    }
    setIsUploading(true);
    setError(null);
    setSuccess(false);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversation_id', conversationId); // <-- send as form field
    try {
      // Always use port 8080 for backend
      const response = await fetch('http://localhost:8080/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      const data = await response.json();
      if (data.text) {
        if (onDocumentParsed) {
          onDocumentParsed(data.text, data.filename);
        }
        setSuccess(true);
      } else {
        throw new Error('No text content received from the server');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="relative flex items-center space-x-2">
      <input
        type="file"
        id="file-upload"
        className="hidden"
        accept=".pdf,.doc,.docx,.pptx,.jpeg,.jpg,.png,.txt"
        onChange={handleFileSelect}
        disabled={isUploading}
      />
      <label
        htmlFor="file-upload"
        className={`cursor-pointer p-2 rounded-full transition-colors ${
          isUploading ? 'text-gray-400' : 'text-gray-500 hover:text-indigo-600'
        }`}
        title={isUploading ? 'Uploading...' : 'Upload Document'}
      >
        <FileText size={20} />
      </label>
      {isUploading && (
        <span className="text-sm text-gray-500 ml-2">Uploading...</span>
      )}
      {error && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-red-100 text-red-700 text-sm rounded-lg whitespace-nowrap">
          {error}
        </div>
      )}
      {success && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-green-100 text-green-700 text-sm rounded-lg whitespace-nowrap">
          Document uploaded and processed!
        </div>
      )}
    </div>
  );
};

export default DocumentUpload; 