"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { 
  Upload, 
  FileX, 
  FileText, 
  FileImage, 
  FilePlus,
  FileMinus,
  CheckCircle2, 
  XCircle, 
  Loader2,
  Trash2,
  Download
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from "./ui";
import { supabase } from "../lib/supabase";

interface DocumentUploaderProps {
  residentId: string;
  societyId: string;
  onUploadComplete?: (documents: any[]) => void;
  onError?: (error: string) => void;
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

interface DocumentType {
  id: string;
  name: string;
}

const documentTypes: DocumentType[] = [
  { id: "identity", name: "Identity Proof" },
  { id: "address", name: "Address Proof" },
  { id: "agreement", name: "Rental Agreement" },
  { id: "maintenance", name: "Maintenance Receipt" },
  { id: "vehicle", name: "Vehicle Registration" },
  { id: "other", name: "Other Document" },
];

const DocumentUploader = ({ residentId, societyId, onUploadComplete, onError }: DocumentUploaderProps) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [documentType, setDocumentType] = useState<string>("other");
  const [description, setDescription] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccess, setUploadSuccess] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (files.length + acceptedFiles.length > 10) {
      setErrorMessage("Maximum 10 files can be uploaded at once");
      return;
    }

    // Create preview for images and PDFs
    const filesWithPreview = acceptedFiles.map(file => 
      Object.assign(file, {
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        id: crypto.randomUUID()
      })
    );
    
    setFiles((prevFiles) => [...prevFiles, ...filesWithPreview]);
    setErrorMessage(null);
  }, [files]);

  const { 
    getRootProps, 
    getInputProps, 
    isDragActive,
    isDragAccept,
    isDragReject 
  } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': [],
      'application/pdf': [],
      'application/msword': [],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
      'application/vnd.ms-excel': [],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [],
      'text/plain': []
    },
    maxSize: maxFileSize,
    maxFiles: 10,
    onDropRejected: (fileRejections) => {
      const errors: string[] = [];
      fileRejections.forEach(rejection => {
        rejection.errors.forEach(error => {
          if (error.code === 'file-too-large') {
            errors.push(`${rejection.file.name} is too large. Maximum size is 10MB.`);
          } else if (error.code === 'file-invalid-type') {
            errors.push(`${rejection.file.name} has an invalid file type.`);
          } else {
            errors.push(`${rejection.file.name}: ${error.message}`);
          }
        });
      });
      setErrorMessage(errors.join('\n'));
    }
  });

  const removeFile = (fileId: string) => {
    setFiles(prevFiles => {
      const newFiles = prevFiles.filter(file => file.id !== fileId);
      return newFiles;
    });
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      setErrorMessage("Please select at least one file to upload");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadSuccess(null);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      formData.append('residentId', residentId);
      formData.append('societyId', societyId);
      formData.append('documentType', documentType);
      formData.append('description', description);

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to upload documents");
      }

      // Clean up previews
      files.forEach(file => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });

      setUploadSuccess(true);
      setFiles([]);
      setDescription("");
      
      // Call the callback with results
      if (onUploadComplete && result.data) {
        onUploadComplete(result.data);
      }

      if (result.errors && result.errors.length > 0) {
        setErrorMessage(`Some files were not uploaded: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      setUploadSuccess(false);
      setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred");
      
      if (onError) {
        onError(error instanceof Error ? error.message : "Unknown error occurred");
      }
    } finally {
      setUploading(false);
      setUploadProgress(100);
      
      // Reset progress and success message after delay
      setTimeout(() => {
        setUploadProgress(0);
        if (uploadSuccess) {
          setUploadSuccess(null);
        }
      }, 3000);
    }
  };

  // Get file icon based on type
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <FileImage className="h-8 w-8 text-blue-500" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else if (file.type.includes('word')) {
      return <FileText className="h-8 w-8 text-blue-600" />;
    } else if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
      return <FileText className="h-8 w-8 text-green-600" />;
    } else {
      return <FileText className="h-8 w-8 text-gray-500" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Clean up previews on unmount
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
    };
  }, [files]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Upload Documents</CardTitle>
        <CardDescription>
          Upload documents for resident. Supported formats: Images, PDF, Word, Excel, Text
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document Type Selector */}
        <div className="space-y-2">
          <Label htmlFor="document-type">Document Type</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger id="document-type">
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Description Field */}
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Add a description for this document"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
        
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragAccept ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 
            isDragReject ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 
            isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 
            'border-gray-300 hover:border-blue-500 dark:border-gray-600 dark:hover:border-blue-400'}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="h-10 w-10 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">
              {isDragActive 
                ? isDragReject 
                  ? "Some files are not supported" 
                  : "Drop files here..." 
                : "Drag & drop files here, or click to select"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Supports: Images, PDF, Word, Excel and Text (Max 10MB per file)
            </p>
          </div>
        </div>
        
        {/* Error Message */}
        {errorMessage && (
          <div className="p-3 text-sm rounded-md bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800/50">
            <div className="flex items-start">
              <XCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <div>{errorMessage}</div>
            </div>
          </div>
        )}
        
        {/* Success Message */}
        {uploadSuccess && (
          <div className="p-3 text-sm rounded-md bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/50">
            <div className="flex items-center">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              <div>Documents uploaded successfully!</div>
            </div>
          </div>
        )}
        
        {/* File List */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Selected Files ({files.length})
            </p>
            <div className="max-h-64 overflow-y-auto space-y-2 rounded-md border border-gray-200 dark:border-gray-700 p-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Upload Progress */}
        {uploadProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => {
            setFiles([]);
            setErrorMessage(null);
          }}
          disabled={files.length === 0 || uploading}
        >
          Clear All
        </Button>
        <Button 
          onClick={uploadFiles} 
          disabled={files.length === 0 || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Documents
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DocumentUploader; 