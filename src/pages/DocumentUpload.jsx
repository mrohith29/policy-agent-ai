import React, { useState } from 'react';

const DocumentUpload = ({ onDocumentParsed }) => {
  const [file, setFile] = useState(null);

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("http://localhost:8000/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    onDocumentParsed(data.text || "");  // send parsed text back to Chat
  };

  return (
    <div className="flex items-center space-x-2">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        accept=".pdf,.docx,.pptx,.jpeg,.jpg,.png"
        className="p-2"
      />
      <button
        onClick={handleUpload}
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
      >
        Upload
      </button>
    </div>
  );
};

export default DocumentUpload;
