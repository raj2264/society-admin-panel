"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { FileText, Upload, Search, X, User, ChevronRight, Home } from "lucide-react";
import DocumentList from "../../../components/DocumentList";
import DocumentUploader from "../../../components/DocumentUploader";
import { Input } from "../../../components/ui/input";

interface Resident {
  id: string;
  email: string;
  name: string;
  unit_number: string;
  phone: string;
  status: string;
  created_at: string;
}

export default function DocumentsPage() {
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [activeSocietyTab, setActiveSocietyTab] = useState<string>("documents");
  const [activeResidentTab, setActiveResidentTab] = useState<string>("documents");

  useEffect(() => {
    getSocietyId();
  }, []);

  useEffect(() => {
    if (societyId) {
      fetchResidents();
    }
  }, [societyId]);

  // Fetch the society ID of the logged-in admin
  async function getSocietyId() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;
      
      const { data: adminData, error } = await supabase
        .from("society_admins")
        .select("society_id")
        .eq("user_id", session.user.id)
        .single();
      
      if (error) {
        console.error("Error fetching society ID:", error);
        return;
      }
      
      setSocietyId(adminData.society_id);
      setLoading(false);
    } catch (error) {
      console.error("Error getting society ID:", error);
      setLoading(false);
    }
  }

  // Fetch residents for this society
  async function fetchResidents() {
    try {
      const { data, error } = await supabase
        .from("residents")
        .select("*")
        .eq("society_id", societyId)
        .order("unit_number", { ascending: true });
      
      if (error) {
        console.error("Error fetching residents:", error);
        return;
      }
      
      setResidents(data || []);
    } catch (error) {
      console.error("Error in fetchResidents:", error);
    }
  }

  // Filter residents based on search term
  const filteredResidents = residents.filter(resident => {
    const search = searchTerm.toLowerCase();
    return resident.name.toLowerCase().includes(search) || 
           resident.unit_number.toLowerCase().includes(search) ||
           resident.email.toLowerCase().includes(search);
  });

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!societyId) {
    return (
      <div className="text-center py-20">
        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Society Not Found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Unable to determine your society. Please try refreshing the page.
        </p>
        <Button onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Document Management</h1>
        <p className="text-gray-500 dark:text-gray-400">
          View and manage all documents uploaded for residents in your society
        </p>
      </div>

      {selectedResident ? (
        <div>
          <div className="flex items-center mb-4">
            <Button 
              variant="ghost" 
              className="flex items-center mr-2 hover:bg-gray-100 dark:hover:bg-gray-800" 
              onClick={() => setSelectedResident(null)}
            >
              <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
              Back to Residents
            </Button>
            <span className="text-gray-500 dark:text-gray-400">|</span>
            <div className="flex items-center ml-2">
              <User className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100">{selectedResident.name}</span>
              <span className="mx-2 text-gray-400 dark:text-gray-600">•</span>
              <Home className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">{selectedResident.unit_number}</span>
            </div>
          </div>

          <Tabs value={activeResidentTab} onValueChange={setActiveResidentTab} className="w-full">
            <TabsList className="mb-4 bg-gray-100 dark:bg-gray-800">
              <TabsTrigger value="documents" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">Documents</TabsTrigger>
              <TabsTrigger value="upload" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">Upload Documents</TabsTrigger>
            </TabsList>
            <TabsContent value="documents">
              <DocumentList 
                societyId={societyId}
                residentId={selectedResident.id}
                showAddButton={true}
                onAddClick={() => setActiveResidentTab("upload")}
                onDocumentDeleted={() => {
                  // Documents will be refreshed automatically by the component
                }}
              />
            </TabsContent>
            <TabsContent value="upload">
              <Card className="border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle>Upload Documents for {selectedResident.name}</CardTitle>
                  <CardDescription>
                    Upload important documents like rental agreements, ID proofs, etc.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentUploader 
                    residentId={selectedResident.id}
                    societyId={societyId as string}
                    onUploadComplete={() => {
                      // Switch back to documents tab
                      setActiveResidentTab("documents");
                    }}
                    onError={(error) => {
                      console.error("Document upload error:", error);
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <>
          {/* All Society Documents */}
          <Tabs value={activeSocietyTab} onValueChange={setActiveSocietyTab} className="w-full">
            <TabsList className="mb-4 bg-gray-100 dark:bg-gray-800">
              <TabsTrigger value="documents" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">Documents</TabsTrigger>
              <TabsTrigger value="upload" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">Upload Documents</TabsTrigger>
            </TabsList>
            
            <TabsContent value="documents">
              <Card className="mb-6 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <CardTitle>Society-wide Documents</CardTitle>
                      <CardDescription>
                        View and manage documents that are not associated with specific residents
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={() => setActiveSocietyTab("upload")}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Document
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <DocumentList 
                    societyId={societyId}
                    showAddButton={true}
                    onAddClick={() => setActiveSocietyTab("upload")}
                    onDocumentDeleted={() => {
                      // Documents will be refreshed automatically by the component
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="upload">
              <Card className="mb-6 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle>Upload Society Document</CardTitle>
                  <CardDescription>
                    Upload important documents related to your society
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentUploader 
                    residentId=""
                    societyId={societyId as string}
                    onUploadComplete={() => {
                      // Switch back to documents tab
                      setActiveSocietyTab("documents");
                    }}
                    onError={(error) => {
                      console.error("Document upload error:", error);
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Residents List */}
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Resident Documents</CardTitle>
                  <CardDescription>
                    Select a resident to view or upload their documents
                  </CardDescription>
                </div>
                <div className="relative w-full md:max-w-xs flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                  <Input
                    placeholder="Search residents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredResidents.length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  {searchTerm ? (
                    <>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No matching residents</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">Try adjusting your search</p>
                      <Button variant="outline" onClick={() => setSearchTerm("")} className="border-gray-200 dark:border-gray-700">Clear Search</Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No residents found</h3>
                      <p className="text-gray-500 dark:text-gray-400">Add residents from the Residents page</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredResidents.map((resident) => (
                    <div
                      key={resident.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors"
                      onClick={() => setSelectedResident(resident)}
                    >
                      <div className="flex items-center">
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full">
                          <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {resident.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Unit: {resident.unit_number}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
} 