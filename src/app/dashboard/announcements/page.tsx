"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster } from "sonner";
import { format } from "date-fns";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Edit,
  Megaphone,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_important: boolean;
  active: boolean;
}

export default function AnnouncementsPage() {
  const router = useRouter();
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 10;
  
  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error || !data.session) {
          console.log("Not authenticated, redirecting to login");
          router.push('/login');
          return;
        }
        
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error checking auth:", error);
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router, supabase]);
  
  useEffect(() => {
    async function fetchAnnouncements() {
      if (!isAuthenticated) return;
      
      try {
        setLoading(true);
        
        // Get society admin info
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          throw new Error(sessionError?.message || "Not authenticated");
        }
        
        // Get society id for current admin - handle multiple entries
        const { data: adminData, error: adminError } = await supabase
          .from("society_admins")
          .select("society_id, societies(name)")
          .eq("user_id", sessionData.session.user.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (adminError) {
          throw new Error(adminError.message || "Failed to get society info");
        }
        
        if (!adminData || adminData.length === 0) {
          // Sign out the user since they don't have admin access
          await supabase.auth.signOut();
          toast.error("Access Denied", {
            description: "You don't have access to any society. Please contact your superadmin.",
          });
          router.push('/auth/login');
          return;
        }
        
        // Get announcements for this society with pagination
        const { data, count, error } = await supabase
          .from("announcements")
          .select("*", { count: "exact" })
          .eq("society_id", adminData[0].society_id)
          .order("created_at", { ascending: false })
          .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);
          
        if (error) {
          throw error;
        }

        setHasMore((data?.length || 0) >= ITEMS_PER_PAGE);
        
        if (page === 0) {
          setAnnouncements(data || []);
        } else {
          setAnnouncements([...announcements, ...(data || [])]);
        }
      } catch (error: any) {
        if (error.message === "No society found for this admin") {
          // Sign out the user since they don't have admin access
          await supabase.auth.signOut();
          toast.error("Access Denied", {
            description: "You don't have access to any society. Please contact your superadmin.",
          });
          router.push('/auth/login');
          return;
        }
        
        toast.error("Error loading announcements", {
          description: error.message,
        });
        console.error("Error loading announcements:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAnnouncements();
  }, [refreshKey, supabase, isAuthenticated, router, page]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error("You must be logged in to publish announcements");
      router.push('/auth/login');
      return;
    }
    
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    
    try {
      setLoading(true);
      
      // Get society admin info
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error(sessionError?.message || "Not authenticated");
      }
      
      // Get society id for current admin - handle multiple entries
      const { data: adminData, error: adminError } = await supabase
        .from("society_admins")
        .select("society_id, societies(name)")
        .eq("user_id", sessionData.session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (adminError) {
        throw new Error(adminError.message || "Failed to get society info");
      }
      
      if (!adminData || adminData.length === 0) {
        // Sign out the user since they don't have admin access
        await supabase.auth.signOut();
        toast.error("Access Denied", {
          description: "You don't have access to any society. Please contact your superadmin.",
        });
        router.push('/auth/login');
        return;
      }
      
      // Create announcement
      const { error } = await supabase.from("announcements").insert({
        society_id: adminData[0].society_id,
        title: title.trim(),
        content: content.trim(),
        created_by: sessionData.session.user.id,
        is_important: isImportant,
      });
      
      if (error) {
        throw error;
      }
      
      toast.success("Announcement published successfully", {
        description: "Residents will be notified of this announcement",
      });
      
      // Reset form
      setTitle("");
      setContent("");
      setIsImportant(false);
      
      // Refresh announcement list
      setPage(0);
      setRefreshKey(prevKey => prevKey + 1);
      
    } catch (error: any) {
      if (error.message === "No society found for this admin") {
        // Sign out the user since they don't have admin access
        await supabase.auth.signOut();
        toast.error("Access Denied", {
          description: "You don't have access to any society. Please contact your superadmin.",
        });
        router.push('/auth/login');
        return;
      }
      
      toast.error("Error publishing announcement", {
        description: error.message,
      });
      console.error("Error publishing announcement:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleAnnouncementStatus = async (announcement: Announcement) => {
    if (!isAuthenticated) {
      toast.error("You must be logged in to modify announcements");
      router.push('/login');
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from("announcements")
        .update({ active: !announcement.active })
        .eq("id", announcement.id);
        
      if (error) {
        throw error;
      }
      
      toast.success(`Announcement ${announcement.active ? "archived" : "activated"}`);
      
      // Refresh announcement list
      setRefreshKey(prevKey => prevKey + 1);
      
    } catch (error: any) {
      toast.error("Error updating announcement status", {
        description: error.message,
      });
      console.error("Error updating announcement:", error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything if not authenticated yet
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-6 max-w-5xl">
        <div className="text-center py-12">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Checking authentication...</p>
        </div>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex items-center mb-6">
        <Megaphone className="h-8 w-8 mr-3 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Announcements & Notices</h1>
      </div>
      
      <Card className="mb-8 border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl">Create New Announcement</CardTitle>
          <CardDescription>
            Post important announcements and notices to all residents in your society.
            Residents will receive push notifications for new announcements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Announcement Title</Label>
              <Input
                id="title"
                placeholder="e.g., Water Supply Interruption Notice"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">Announcement Content</Label>
              <Textarea
                id="content"
                placeholder="Enter the detailed announcement content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={loading}
                rows={5}
                required
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="important"
                checked={isImportant}
                onCheckedChange={(checked) => setIsImportant(checked as boolean)}
              />
              <Label htmlFor="important" className="font-medium cursor-pointer">
                Mark as important announcement
              </Label>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 border-t pt-4 bg-gray-50 dark:bg-gray-800/50">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setTitle("");
              setContent("");
              setIsImportant(false);
            }}
            disabled={loading}
          >
            Reset
          </Button>
          <Button 
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !content.trim()}
            className="gap-1"
          >
            <Bell className="h-4 w-4" />
            Publish Announcement
          </Button>
        </CardFooter>
      </Card>
      
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Previous Announcements</h2>
      
      {loading && announcements.length === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading announcements...</p>
        </div>
      ) : announcements.length === 0 ? (
        <Card className="bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-center">
              No announcements yet. Create your first announcement to notify residents.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className={`border ${announcement.active ? 'border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20'}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {announcement.title}
                      {announcement.is_important && (
                        <Badge variant="destructive" className="text-xs font-medium">
                          Important
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Posted on {format(new Date(announcement.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </CardDescription>
                  </div>
                  <Badge variant={announcement.active ? "outline" : "secondary"} className="text-xs">
                    {announcement.active ? "Active" : "Archived"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {announcement.content}
                </p>
              </CardContent>
              <CardFooter className="flex justify-end border-t pt-3 space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => toggleAnnouncementStatus(announcement)}
                >
                  {announcement.active ? (
                    <>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Archive
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Activate
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
          
          {hasMore && announcements.length > 0 && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More Announcements"}
              </Button>
            </div>
          )}
        </div>
      )}
      <Toaster />
    </div>
  );
} 