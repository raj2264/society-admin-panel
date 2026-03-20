"use client";

import { useState, useEffect } from "react";
import { FileText, FileImage, Download, Trash2, ExternalLink, Calendar, Search, X, Filter } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "./ui";
import { supabase } from "../lib/supabase";

interface DocumentListProps {
  residentId?: string;
  societyId: string;
  showAddButton?: boolean;
  onAddClick?: () => void;
  onDocumentDeleted?: () => void;
}

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  public_url: string;
  document_type: string;
  description: string;
  created_at: string;
  resident_id: string;
  resident_name?: string;
  resident_unit?: string;
}

const DocumentList = ({ 
  residentId,
  societyId,
  showAddButton = false,
  onAddClick,
  onDocumentDeleted
}: DocumentListProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState(false);

  const documentTypeLabels: Record<string, string> = {
    "identity": "Identity Proof",
    "address": "Address Proof",
    "agreement": "Rental Agreement",
    "maintenance": "Maintenance Receipt",
    "vehicle": "Vehicle Registration",
    "other": "Other Document"
  };

  useEffect(() => {
    fetchDocuments();
  }, [residentId, societyId]);

  useEffect(() => {
    // Apply filters when documents, search term, or filters change
    if (documents.length > 0) {
      let filtered = [...documents];
      
      // Apply search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filtered = filtered.filter(doc => 
          doc.file_name.toLowerCase().includes(search) || 
          (doc.description && doc.description.toLowerCase().includes(search)) ||
          (doc.resident_name && doc.resident_name.toLowerCase().includes(search))
        );
      }
      
      // Apply document type filter
      if (documentTypeFilter && documentTypeFilter !== "all") {
        filtered = filtered.filter(doc => doc.document_type === documentTypeFilter);
      }
      
      setFilteredDocuments(filtered);
    } else {
      setFilteredDocuments([]);
    }
  }, [documents, searchTerm, documentTypeFilter]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let url = `/api/documents?societyId=${societyId}`;
      if (residentId) {
        url += `&residentId=${residentId}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch documents");
      }
      
      setDocuments(result.data || []);
    } catch (err) {
      console.error("Error fetching documents:", err);
      setError("Failed to load documents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      setDeletingDocument(true);
      
      const response = await fetch(`/api/documents?id=${documentId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to delete document");
      }
      
      // Update the documents list
      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== documentId));
      
      // Close the dialog
      setDeleteConfirmOpen(false);
      
      // Call the callback if provided
      if (onDocumentDeleted) {
        onDocumentDeleted();
      }
    } catch (err) {
      console.error("Error deleting document:", err);
      setError("Failed to delete document. Please try again.");
    } finally {
      setDeletingDocument(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <FileImage className="h-5 w-5 text-blue-500" />;
    } else {
      return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Render empty state
  if (!loading && filteredDocuments.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Documents</CardTitle>
              <CardDescription>
                {residentId ? "Documents uploaded for this resident" : "All resident documents"}
              </CardDescription>
            </div>
            {showAddButton && (
              <Button onClick={onAddClick}>Upload Documents</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {searchTerm || documentTypeFilter ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No matching documents</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Try adjusting your filters</p>
              <div className="flex justify-center space-x-2">
                {searchTerm && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSearchTerm("")}
                  >
                    Clear Search
                  </Button>
                )}
                {documentTypeFilter && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDocumentTypeFilter("all")}
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Documents Available</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {residentId 
                  ? "No documents have been uploaded for this resident yet" 
                  : "No documents have been uploaded for any resident yet"
                }
              </p>
              {showAddButton && (
                <Button onClick={onAddClick}>
                  Upload Your First Document
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-xl">Documents</CardTitle>
            <CardDescription>
              {residentId ? "Documents uploaded for this resident" : "All resident documents"}
            </CardDescription>
          </div>
          {showAddButton && (
            <Button onClick={onAddClick}>Upload Documents</Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm rounded-md bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800/50">
            {error}
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-800"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="flex-shrink-0 w-full sm:w-44">
            <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
              <SelectTrigger>
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2 text-gray-500" />
                  <SelectValue placeholder="Filter by type" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(documentTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Documents List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center p-3 border rounded-lg">
                <Skeleton className="h-12 w-12 rounded-md mr-4" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y rounded-md border">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-start md:items-center gap-3 flex-1 min-w-0">
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                    {getFileIcon(doc.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {doc.file_name}
                      </h4>
                      <Badge variant="outline" className="whitespace-nowrap text-xs">
                        {documentTypeLabels[doc.document_type] || doc.document_type}
                      </Badge>
                    </div>
                    
                    {doc.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                        {doc.description}
                      </p>
                    )}
                    
                    {!residentId && doc.resident_name && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Resident: {doc.resident_name} {doc.resident_unit ? `(${doc.resident_unit})` : ''}
                      </p>
                    )}
                    
                    <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(doc.created_at)}
                      <span className="mx-2">•</span>
                      {formatFileSize(doc.file_size)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <a href={doc.public_url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">View</span>
                    </a>
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <a href={doc.public_url} download={doc.file_name} className="flex items-center">
                      <Download className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Download</span>
                    </a>
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 dark:text-red-400"
                    onClick={() => {
                      setSelectedDocument(doc);
                      setDeleteConfirmOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="flex items-center mt-2 p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
              {getFileIcon(selectedDocument.file_type)}
              <div className="ml-3">
                <h4 className="font-medium text-sm">{selectedDocument.file_name}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {documentTypeLabels[selectedDocument.document_type] || selectedDocument.document_type}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deletingDocument}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedDocument && handleDeleteDocument(selectedDocument.id)}
              disabled={deletingDocument}
            >
              {deletingDocument ? (
                <>
                  <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Deleting...
                </>
              ) : (
                <>Delete</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DocumentList; 