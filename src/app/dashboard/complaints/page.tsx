"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toProxyUrl } from "@/lib/storage-proxy";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster } from "sonner";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Edit,
  FileText,
  Filter,
  MessageCircle,
  PanelRight,
  RefreshCcw,
  Search,
  Send,
  User,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";

interface Complaint {
  id: string;
  title: string;
  description: string;
  type: 'personal' | 'community';
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  created_at: string;
  updated_at: string;
  resident_id: string;
  society_id: string;
  attachment_url?: string;
  attachment_name?: string;
  residents: {
    name: string;
    unit_number: string;
  };
  complaint_updates: ComplaintUpdate[];
}

interface ComplaintUpdate {
  id: string;
  complaint_id: string;
  user_id: string;
  is_admin: boolean;
  comment: string;
  created_at: string;
}

export default function AdminComplaintsPage() {
  const router = useRouter();
  
  // Group all state declarations together at the top
  const [userId, setUserId] = useState("");
  const [societyId, setSocietyId] = useState("");
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [personalComplaints, setPersonalComplaints] = useState<Complaint[]>([]);
  const [communityComplaints, setCommunityComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [newComment, setNewComment] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [displayPageAll, setDisplayPageAll] = useState(0);
  const [displayPagePersonal, setDisplayPagePersonal] = useState(0);
  const [displayPageCommunity, setDisplayPageCommunity] = useState(0);
  const ITEMS_PER_PAGE = 10;

  // Initialize data on mount
  useEffect(() => {
    let mounted = true;

    const initializeData = async () => {
      try {
        if (!mounted) return;
        setLoading(true);

        // Get session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log("No active session");
          if (mounted) {
            router.push('/auth/login');
          }
          return;
        }

        // Get society_id for the admin
        const { data: adminData, error: adminError } = await supabase
          .from("society_admins")
          .select("society_id")
          .eq("user_id", session.user.id)
          .single();
          
        if (adminError || !adminData) {
          console.error("Society ID error:", adminError);
          if (mounted) {
            toast.error("Access Error", {
              description: "Failed to get society information."
            });
            router.push('/auth/login');
          }
          return;
        }
        
        if (mounted) {
          setUserId(session.user.id);
          setSocietyId(adminData.society_id);
        }
        
      } catch (error) {
        console.error("Error initializing data:", error);
        if (mounted) {
          toast.error("Error", {
            description: "An error occurred while loading the page."
          });
          router.push('/auth/login');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    initializeData();
    
    return () => {
      mounted = false;
    };
  }, [router]);

  // Fetch complaints effect
  useEffect(() => {
    let mounted = true;

    const fetchComplaints = async () => {
      if (!societyId || !mounted) return;
      
      try {
        if (mounted) setLoading(true);
        
        // Get session for auth token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log("No active session found");
          if (mounted) router.push('/auth/login');
          return;
        }
        
        // API call to get complaints with resident info joined
        const response = await fetch(`/api/complaints?societyId=${societyId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch complaints');
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch complaints');
        }
        
        if (mounted) {
          // Store all complaints
          setAllComplaints(data.complaints || []);
          
          // Split complaints into personal and community
          const personal = data.complaints.filter((c: Complaint) => c.type === 'personal');
          const community = data.complaints.filter((c: Complaint) => c.type === 'community');
          
          setPersonalComplaints(personal);
          setCommunityComplaints(community);
        }
        
      } catch (error: any) {
        console.error("Error loading complaints:", error);
        if (mounted) {
          if (error.message === "Unauthorized" || error.message === "Not authorized to access this society's complaints") {
            router.push('/auth/login');
          } else {
            toast.error("Error loading complaints", {
              description: error.message || "Unknown error occurred",
            });
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    fetchComplaints();
    
    return () => {
      mounted = false;
    };
  }, [refreshKey, societyId, router]);

  // Show loading state while loading data
  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading complaints...</p>
        </div>
      </div>
    );
  }
  
  // Filter complaints based on status and search query
  const filterComplaints = (complaints: Complaint[]) => {
    return complaints.filter(complaint => {
      // Filter by status
      if (statusFilter !== 'all' && complaint.status !== statusFilter) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        return (
          complaint.title.toLowerCase().includes(query) ||
          complaint.description.toLowerCase().includes(query) ||
          (complaint.residents?.name && complaint.residents.name.toLowerCase().includes(query)) ||
          (complaint.residents?.unit_number && complaint.residents.unit_number.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  };

  // Get paginated display for complaints
  const getPaginatedComplaints = (complaints: Complaint[], page: number) => {
    const filtered = filterComplaints(complaints);
    const startIdx = 0;
    const endIdx = (page + 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIdx, endIdx);
  };

  // Check if there are more items to load
  const hasMoreComplaints = (complaints: Complaint[], page: number) => {
    const filtered = filterComplaints(complaints);
    return filtered.length > (page + 1) * ITEMS_PER_PAGE;
  };;
  
  const handleUpdateComplaint = async () => {
    if (!selectedComplaint) return;
    
    try {
      setLoading(true);
      
      // Check if we have something to update
      if (!newComment && !newStatus) {
        toast.error("Please provide a comment or update the status");
        return;
      }
      
      // Get session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session found");
      }
      
      // Prepare update data
      const updateData = {
        complaintId: selectedComplaint.id,
        userId,
        comment: newComment.trim() || null,
        status: newStatus || null,
        isAdmin: true, // Always true for admin panel
        token: session.access_token
      };
      
      // Make API call to update complaint
      const response = await fetch('/api/complaints', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updateData),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update complaint');
      }
      
      toast.success("Complaint updated successfully");
      
      // Reset form
      setNewComment("");
      setNewStatus("");
      
      // Refresh complaints list and close dialog
      setRefreshKey(prevKey => prevKey + 1);
      setDetailsOpen(false);
      
    } catch (error: any) {
      toast.error("Error updating complaint", {
        description: error.message || "Unknown error occurred",
      });
      console.error("Error updating complaint:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const openComplaintDetails = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setNewStatus(complaint.status); // Pre-select current status
    setDetailsOpen(true);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Resolved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const renderComplaintCard = (complaint: Complaint) => (
    <Card key={complaint.id} className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{complaint.title}</CardTitle>
            <CardDescription className="flex items-center mt-1 gap-1">
              {complaint.type === 'personal' ? (
                <><User size={14} /> Personal</>
              ) : (
                <><PanelRight size={14} /> Community</>
              )}
              <span className="mx-1">•</span>
              {format(new Date(complaint.created_at), 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <div>
            {getStatusBadge(complaint.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-gray-700 line-clamp-2">{complaint.description}</p>
        <div className="mt-2 text-sm text-gray-500">
          {complaint.residents && (
            <div className="flex items-center gap-1">
              <span className="font-medium">From:</span> {complaint.residents.name} ({complaint.residents.unit_number})
            </div>
          )}
          <div className="flex items-center gap-1 mt-1">
            <span className="font-medium">Updates:</span> {complaint.complaint_updates?.length || 0}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => openComplaintDetails(complaint)}>
          View Details
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <span className="sr-only">Update status</span>
              <Edit className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Update Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                try {
                  setLoading(true);
                  
                  // Get session for auth token
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) {
                    throw new Error("No active session found");
                  }
                  
                  const updateData = {
                    complaintId: complaint.id,
                    userId,
                    status: 'pending',
                    isAdmin: true,
                    token: session.access_token
                  };
                  await fetch('/api/complaints', {
                    method: 'PUT',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify(updateData),
                  });
                  setRefreshKey(prevKey => prevKey + 1);
                  toast.success("Status updated to Pending");
                } catch (error) {
                  toast.error("Failed to update status");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Mark as Pending
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                try {
                  setLoading(true);
                  
                  // Get session for auth token
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) {
                    throw new Error("No active session found");
                  }
                  
                  const updateData = {
                    complaintId: complaint.id,
                    userId,
                    status: 'in_progress',
                    isAdmin: true,
                    token: session.access_token
                  };
                  await fetch('/api/complaints', {
                    method: 'PUT',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify(updateData),
                  });
                  setRefreshKey(prevKey => prevKey + 1);
                  toast.success("Status updated to In Progress");
                } catch (error) {
                  toast.error("Failed to update status");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Mark as In Progress
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                try {
                  setLoading(true);
                  
                  // Get session for auth token
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) {
                    throw new Error("No active session found");
                  }
                  
                  const updateData = {
                    complaintId: complaint.id,
                    userId,
                    status: 'resolved',
                    isAdmin: true,
                    token: session.access_token
                  };
                  await fetch('/api/complaints', {
                    method: 'PUT',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify(updateData),
                  });
                  setRefreshKey(prevKey => prevKey + 1);
                  toast.success("Status updated to Resolved");
                } catch (error) {
                  toast.error("Failed to update status");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Mark as Resolved
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                try {
                  setLoading(true);
                  
                  // Get session for auth token
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) {
                    throw new Error("No active session found");
                  }
                  
                  const updateData = {
                    complaintId: complaint.id,
                    userId,
                    status: 'rejected',
                    isAdmin: true,
                    token: session.access_token
                  };
                  await fetch('/api/complaints', {
                    method: 'PUT',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify(updateData),
                  });
                  setRefreshKey(prevKey => prevKey + 1);
                  toast.success("Status updated to Rejected");
                } catch (error) {
                  toast.error("Failed to update status");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Mark as Rejected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
  
  const renderComplaintDetails = () => {
    if (!selectedComplaint) return null;
    
    return (
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between">
              <span>{selectedComplaint.title}</span>
              <span>{getStatusBadge(selectedComplaint.status)}</span>
            </DialogTitle>
            <DialogDescription>
              Submitted on {format(new Date(selectedComplaint.created_at), 'MMMM d, yyyy')} by {selectedComplaint.residents?.name} ({selectedComplaint.residents?.unit_number})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-2">
            <div>
              <h4 className="font-medium">Description</h4>
              <p className="text-sm text-gray-700 mt-1">{selectedComplaint.description}</p>
            </div>

            {selectedComplaint.attachment_url && (
              <div>
                <h4 className="font-medium mb-2">Attachment</h4>
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200">
                  <Image
                    src={toProxyUrl(selectedComplaint.attachment_url)}
                    alt={selectedComplaint.attachment_name || "Complaint attachment"}
                    fill
                    className="object-contain"
                    onClick={() => window.open(toProxyUrl(selectedComplaint.attachment_url), '_blank')}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Click image to view full size
                </p>
              </div>
            )}
            
            <Separator />
            
            <div>
              <h4 className="font-medium">Updates</h4>
              {selectedComplaint.complaint_updates && selectedComplaint.complaint_updates.length > 0 ? (
                <div className="space-y-3 mt-2">
                  {selectedComplaint.complaint_updates
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map(update => (
                    <div key={update.id} className="bg-gray-50 p-3 rounded-md">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          {update.is_admin ? (
                            <Badge variant="outline" className="bg-purple-100 text-purple-800">Admin</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-800">Resident</Badge>
                          )}
                          <span className="ml-1">
                            {format(new Date(update.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm mt-1">{update.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-1">No updates yet</p>
              )}
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium">Add Update</h4>
              
              <div className="mt-2 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="comment">Comment</Label>
                  <Textarea
                    id="comment"
                    placeholder="Add your comment here..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Update Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateComplaint} disabled={!newComment && !newStatus}>
              Submit Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  return (
    <div className="container mx-auto p-4">
      <Toaster position="top-center" />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Complaints</h1>
        <Button 
          variant="outline" 
          onClick={() => setRefreshKey(prev => prev + 1)}
          disabled={loading}
        >
          <RefreshCcw size={16} className="mr-1" />
          Refresh
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Complaints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="flex mt-1">
                <Input
                  id="search"
                  placeholder="Search by title, description, or resident"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button variant="ghost" className="ml-2" onClick={() => setSearchQuery("")}>
                  Clear
                </Button>
              </div>
            </div>
            
            <div className="w-full md:w-[200px]">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">
            All Complaints
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex-1">
            <User size={16} className="mr-1" />
            Personal Complaints
          </TabsTrigger>
          <TabsTrigger value="community" className="flex-1">
            <MessageCircle size={16} className="mr-1" />
            Community Complaints
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          {loading ? (
            <div className="text-center py-8">Loading complaints...</div>
          ) : getPaginatedComplaints(allComplaints, displayPageAll).length > 0 ? (
            <div>
              <div className="flex justify-between mb-2 text-sm text-gray-500">
                <span>Showing {getPaginatedComplaints(allComplaints, displayPageAll).length} of {filterComplaints(allComplaints).length} complaints</span>
              </div>
              {getPaginatedComplaints(allComplaints, displayPageAll).map(complaint => renderComplaintCard(complaint))}
              {hasMoreComplaints(allComplaints, displayPageAll) && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setDisplayPageAll(displayPageAll + 1)}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Load More Complaints"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No complaints found matching your criteria
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="personal" className="mt-4">
          {loading ? (
            <div className="text-center py-8">Loading personal complaints...</div>
          ) : getPaginatedComplaints(personalComplaints, displayPagePersonal).length > 0 ? (
            <div>
              <div className="flex justify-between mb-2 text-sm text-gray-500">
                <span>Showing {getPaginatedComplaints(personalComplaints, displayPagePersonal).length} of {filterComplaints(personalComplaints).length} personal complaints</span>
              </div>
              {getPaginatedComplaints(personalComplaints, displayPagePersonal).map(complaint => renderComplaintCard(complaint))}
              {hasMoreComplaints(personalComplaints, displayPagePersonal) && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setDisplayPagePersonal(displayPagePersonal + 1)}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Load More Personal Complaints"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No personal complaints found matching your criteria
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="community" className="mt-4">
          {loading ? (
            <div className="text-center py-8">Loading community complaints...</div>
          ) : getPaginatedComplaints(communityComplaints, displayPageCommunity).length > 0 ? (
            <div>
              <div className="flex justify-between mb-2 text-sm text-gray-500">
                <span>Showing {getPaginatedComplaints(communityComplaints, displayPageCommunity).length} of {filterComplaints(communityComplaints).length} community complaints</span>
              </div>
              {getPaginatedComplaints(communityComplaints, displayPageCommunity).map(complaint => renderComplaintCard(complaint))}
              {hasMoreComplaints(communityComplaints, displayPageCommunity) && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setDisplayPageCommunity(displayPageCommunity + 1)}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Load More Community Complaints"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No community complaints found matching your criteria
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {renderComplaintDetails()}
    </div>
  );
} 