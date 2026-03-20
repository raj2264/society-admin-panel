"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/lib/supabase-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MeetingsPage() {
  const { supabase, session } = useSupabase();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState("12:00");
  const [meetingType, setMeetingType] = useState("committee");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [minutesDialogOpen, setMinutesDialogOpen] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState<any>(null);
  const [minutes, setMinutes] = useState({
    topics: "",
    discussions: "",
    conclusions: "",
    notes: "",
    attendees: [] as string[],
    actionItems: [] as any[],
    attachments: [] as any[]
  });
  const [societyId, setSocietyId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSocietyId() {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from("society_admins")
        .select("society_id")
        .eq("user_id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching society ID:", error);
        return;
      }

      setSocietyId(data.society_id);
    }

    fetchSocietyId();
  }, [session, supabase]);

  useEffect(() => {
    if (!societyId) return;
    fetchMeetings();
    fetchTableInfo();
  }, [societyId]);

  async function fetchMeetings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("meetings")
        .select(`
          *,
          meeting_minutes (*),
          meeting_notes (*)
        `)
        .eq("society_id", societyId)
        .order("meeting_date", { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      toast({
        title: "Error",
        description: "Failed to fetch meetings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchTableInfo() {
    try {
      if (!supabase) return;
      
      // First, try to fetch a single record to check if the table exists and has the expected structure
      const { data, error } = await supabase
        .from('meeting_notes')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error("Error checking meeting_notes table:", error);
        return;
      }
      
      // If we get here, the table exists and is accessible
      console.log("Meeting notes table is accessible");
      
      // Log the structure of the first record if it exists
      if (data && data.length > 0) {
        console.log("Sample record structure:", Object.keys(data[0]));
      }
      
    } catch (error) {
      console.error("Error in fetchTableInfo:", error);
    }
  }

  async function handleAddMeeting() {
    try {
      // Check if user is authenticated
      if (!session?.user?.id) {
        toast({
          title: "Error",
          description: "You must be logged in to schedule a meeting",
          variant: "destructive",
        });
        return;
      }

      // Combine date and time
      const meetingDateTime = new Date(date);
      const [hours, minutes] = time.split(":").map(Number);
      meetingDateTime.setHours(hours, minutes);

      const { data, error } = await supabase.from("meetings").insert({
        society_id: societyId,
        title,
        description,
        location,
        meeting_date: meetingDateTime.toISOString(),
        meeting_type: meetingType,
        created_by: session.user.id,
      }).select();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Meeting scheduled successfully",
      });

      // Reset form and close dialog
      setTitle("");
      setDescription("");
      setLocation("");
      setDate(new Date());
      setTime("12:00");
      setMeetingType("committee");
      setAddDialogOpen(false);
      
      // Refresh meetings list
      fetchMeetings();
    } catch (error) {
      console.error("Error adding meeting:", error);
      toast({
        title: "Error",
        description: "Failed to schedule meeting",
        variant: "destructive",
      });
    }
  }

  async function handleAddMinutes() {
    try {
      if (!currentMeeting) return;
      
      // Check if user is authenticated
      if (!session?.user?.id) {
        toast({
          title: "Error",
          description: "You must be logged in to add meeting minutes",
          variant: "destructive",
        });
        return;
      }

      console.log("Current meeting:", currentMeeting);
      
      // Check if meeting notes already exist
      const hasExistingNotes = currentMeeting.meeting_notes && currentMeeting.meeting_notes.length > 0;
      
      let result;
      
      if (hasExistingNotes) {
        // Update existing notes
        result = await supabase
          .from("meeting_notes")
          .update({ 
            note_content: JSON.stringify(minutes),
            updated_at: new Date().toISOString()
          })
          .eq("id", currentMeeting.meeting_notes[0].id);
      } else {
        // Create new notes
        result = await supabase
          .from("meeting_notes")
          .insert({
            meeting_id: currentMeeting.id,
            note_content: JSON.stringify(minutes),
            created_by: session.user.id
          });
      }
      
      if (result.error) {
        console.error("Error saving meeting notes:", result.error);
        throw result.error;
      }
      
      // Try to update meeting status to completed
      try {
        const updateData: Record<string, any> = { status: "completed" };
        
        // Only add updated_by if the column exists
        try {
          const { error: checkError } = await supabase
            .from("meetings")
            .select("updated_by")
            .eq("id", currentMeeting.id)
            .single();
            
          if (!checkError) {
            updateData.updated_by = session.user.id;
          }
        } catch (checkError) {
          console.warn("Warning: Could not check for updated_by column:", checkError);
        }
        
      const { error } = await supabase
        .from("meetings")
          .update(updateData)
        .eq("id", currentMeeting.id);
      
      if (error) {
          console.warn("Warning: Could not update meeting status:", error);
          // Continue execution even if status update fails
        }
      } catch (statusError) {
        console.warn("Warning: Could not update meeting status:", statusError);
        // Continue execution even if status update fails
      }

      // Save to localStorage as backup
      const meetingMinutesKey = `meeting_minutes_${currentMeeting.id}`;
      localStorage.setItem(meetingMinutesKey, JSON.stringify(minutes));

      toast({
        title: "Success",
        description: "Meeting minutes saved successfully",
      });

      // Reset form and close dialog
      setMinutes({
        topics: "",
        discussions: "",
        conclusions: "",
        notes: "",
        attendees: [],
        actionItems: [],
        attachments: []
      });
      setMinutesDialogOpen(false);
      setCurrentMeeting(null);
      
      // Refresh meetings list
      fetchMeetings();
    } catch (error) {
      console.error("Error adding meeting minutes:", error);
      toast({
        title: "Error",
        description: "Failed to add meeting minutes: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    }
  }

  function openMinutesDialog(meeting: any) {
    setCurrentMeeting(meeting);
    
    // First try to get minutes from meeting_notes
    if (meeting.meeting_notes && meeting.meeting_notes.length > 0) {
      let noteContent = '';
      try {
        noteContent = meeting.meeting_notes[0].note_content;
        const parsedContent = JSON.parse(noteContent);
        setMinutes({
          topics: parsedContent.topics || "",
          discussions: parsedContent.discussions || "",
          conclusions: parsedContent.conclusions || "",
          notes: parsedContent.notes || "",
          attendees: parsedContent.attendees || [],
          actionItems: parsedContent.actionItems || [],
          attachments: parsedContent.attachments || []
        });
      } catch (e) {
        // If parsing fails, treat the content as legacy format
        setMinutes({
          topics: "",
          discussions: "",
          conclusions: "",
          notes: noteContent || "",
          attendees: [],
          actionItems: [],
          attachments: []
        });
      }
    } else {
    // Try localStorage as fallback (for previously saved notes)
      const meetingMinutesKey = `meeting_minutes_${meeting.id}`;
      const localMinutes = localStorage.getItem(meetingMinutesKey);
      
      if (localMinutes) {
        try {
          const parsedContent = JSON.parse(localMinutes);
          setMinutes({
            topics: parsedContent.topics || "",
            discussions: parsedContent.discussions || "",
            conclusions: parsedContent.conclusions || "",
            notes: parsedContent.notes || "",
            attendees: parsedContent.attendees || [],
            actionItems: parsedContent.actionItems || [],
            attachments: parsedContent.attachments || []
          });
        } catch (e) {
          setMinutes({
            topics: "",
            discussions: "",
            conclusions: "",
            notes: localMinutes || "",
            attendees: [],
            actionItems: [],
            attachments: []
          });
        }
      } else {
        setMinutes({
          topics: "",
          discussions: "",
          conclusions: "",
          notes: "",
          attendees: [],
          actionItems: [],
          attachments: []
        });
      }
    }
    
    setMinutesDialogOpen(true);
  }

  // Helper function to check if a meeting has minutes
  function hasMeetingMinutes(meeting: any) {
    if (!meeting) return false;
    
    // Check in meeting_notes first
    if (meeting.meeting_notes && meeting.meeting_notes.length > 0) {
      return true;
    }
    
    // Check localStorage as fallback
    const meetingMinutesKey = `meeting_minutes_${meeting.id}`;
    const localMinutes = localStorage.getItem(meetingMinutesKey);
    
    return Boolean(
      localMinutes || 
      meeting.minutes_text || 
      (meeting.meeting_minutes && meeting.meeting_minutes.length > 0)
    );
  }

  async function handleCancelMeeting(meetingId: any) {
    try {
      // Check if user is authenticated
      if (!session?.user?.id) {
        toast({
          title: "Error",
          description: "You must be logged in to cancel a meeting",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("meetings")
        .update({ 
          status: "cancelled",
          updated_by: session.user.id
        })
        .eq("id", meetingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Meeting cancelled successfully",
      });
      
      // Refresh meetings list
      fetchMeetings();
    } catch (error) {
      console.error("Error cancelling meeting:", error);
      toast({
        title: "Error",
        description: "Failed to cancel meeting",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteMeeting(meetingId: any) {
    try {
      // Check if user is authenticated
      if (!session?.user?.id) {
        toast({
          title: "Error",
          description: "You must be logged in to delete a meeting",
          variant: "destructive",
        });
        return;
      }

      // Show confirmation dialog
      if (!confirm("Are you sure you want to delete this meeting? This action cannot be undone.")) {
        return;
      }

      const { error } = await supabase
        .from("meetings")
        .delete()
        .eq("id", meetingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Meeting deleted successfully",
      });
      
      // Refresh meetings list
      fetchMeetings();
    } catch (error) {
      console.error("Error deleting meeting:", error);
      toast({
        title: "Error",
        description: "Failed to delete meeting",
        variant: "destructive",
      });
    }
  }

  function getStatusBadgeClass(status: any) {
    // Default to "scheduled" if status is undefined
    const safeStatus = status || "scheduled";
    
    switch (safeStatus) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  function getMeetingTypeText(type: any) {
    return type === 'annual' ? 'Annual General Meeting' : 'Committee Meeting';
  }

  function getMeetingTypeColor(type: any) {
    return type === 'annual' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings Management</h1>
          <p className="text-muted-foreground mt-1">Schedule and manage society meetings</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Schedule New Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Schedule New Meeting</DialogTitle>
              <DialogDescription>
                Create a new meeting for society residents.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter meeting title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="meeting-type">Meeting Type</Label>
                <Select value={meetingType} onValueChange={setMeetingType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select meeting type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="committee">Committee Meeting</SelectItem>
                    <SelectItem value="annual">Annual General Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter meeting description"
                  className="min-h-[100px]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter meeting location"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        required
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label>Time</Label>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMeeting}>Schedule Meeting</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="committee" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="committee" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            Committee Meetings
          </TabsTrigger>
          <TabsTrigger value="annual" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-days"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
            Annual General Meetings
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            Cancelled
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="committee">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                Committee Meetings
              </CardTitle>
              <CardDescription>
                Regular committee meetings for society operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meetings
                      .filter(
                        (meeting) =>
                          meeting.meeting_type === "committee" &&
                          meeting.status !== "cancelled"
                      )
                      .map((meeting) => (
                        <TableRow key={meeting.id}>
                          <TableCell className="font-medium">
                            {meeting.title}
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(meeting.meeting_date),
                              "PPP p"
                            )}
                          </TableCell>
                          <TableCell>{meeting.location}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                                meeting.status === "scheduled" && new Date(meeting.meeting_date) < new Date()
                                  ? "completed"
                                  : meeting.status || "scheduled"
                              )}`}
                            >
                              {meeting.status === "scheduled" && new Date(meeting.meeting_date) < new Date()
                                ? "Completed"
                                : (meeting.status || "scheduled").charAt(0).toUpperCase() +
                                  (meeting.status || "scheduled").slice(1)}
                            </span>
                          </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                              {meeting.status === "scheduled" && new Date(meeting.meeting_date) >= new Date() ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMinutesDialog(meeting)}
                                      className="gap-1"
                                  >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                                    Add Minutes
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                      className="text-red-500 hover:text-red-700 gap-1"
                                    onClick={() => handleCancelMeeting(meeting.id)}
                                  >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                  <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openMinutesDialog(meeting)}
                                      className="gap-1"
                                >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                                  {hasMeetingMinutes(meeting) ? "View Minutes" : "Add Minutes"}
                                </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-500 hover:text-red-700 gap-1"
                                      onClick={() => handleDeleteMeeting(meeting.id)}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                      Delete
                                    </Button>
                                  </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    {meetings.filter(
                      (meeting) =>
                        meeting.meeting_type === "committee" &&
                        meeting.status !== "cancelled"
                    ).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                            className="text-center py-8 text-muted-foreground"
                        >
                            <div className="flex flex-col items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-x"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><line x1="9" x2="15" y1="16" y2="16"/></svg>
                          No committee meetings scheduled
                            </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="annual">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-days"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
                Annual General Meetings
              </CardTitle>
              <CardDescription>
                Annual general meetings for major society decisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meetings
                      .filter(
                        (meeting) =>
                          meeting.meeting_type === "annual" &&
                          meeting.status !== "cancelled"
                      )
                      .map((meeting) => (
                        <TableRow key={meeting.id}>
                          <TableCell className="font-medium">
                            {meeting.title}
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(meeting.meeting_date),
                              "PPP p"
                            )}
                          </TableCell>
                          <TableCell>{meeting.location}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                                meeting.status === "scheduled" && new Date(meeting.meeting_date) < new Date()
                                  ? "completed"
                                  : meeting.status || "scheduled"
                              )}`}
                            >
                              {meeting.status === "scheduled" && new Date(meeting.meeting_date) < new Date()
                                ? "Completed"
                                : (meeting.status || "scheduled").charAt(0).toUpperCase() +
                                  (meeting.status || "scheduled").slice(1)}
                            </span>
                          </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                              {meeting.status === "scheduled" && new Date(meeting.meeting_date) >= new Date() ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMinutesDialog(meeting)}
                                      className="gap-1"
                                  >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                                    Add Minutes
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                      className="text-red-500 hover:text-red-700 gap-1"
                                    onClick={() => handleCancelMeeting(meeting.id)}
                                  >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                  <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openMinutesDialog(meeting)}
                                      className="gap-1"
                                >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                                  {hasMeetingMinutes(meeting) ? "View Minutes" : "Add Minutes"}
                                </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-500 hover:text-red-700 gap-1"
                                      onClick={() => handleDeleteMeeting(meeting.id)}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                      Delete
                                    </Button>
                                  </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    {meetings.filter(
                      (meeting) =>
                        meeting.meeting_type === "annual" &&
                        meeting.status !== "cancelled"
                    ).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                            className="text-center py-8 text-muted-foreground"
                        >
                            <div className="flex flex-col items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-x"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><line x1="9" x2="15" y1="16" y2="16"/></svg>
                          No annual general meetings scheduled
                            </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cancelled">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                Cancelled Meetings
              </CardTitle>
              <CardDescription>
                View cancelled meetings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meetings
                      .filter((meeting) => meeting.status === "cancelled")
                      .map((meeting) => (
                        <TableRow key={meeting.id}>
                          <TableCell className="font-medium">
                            {meeting.title}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getMeetingTypeColor(
                                meeting.meeting_type
                              )}`}
                            >
                              {getMeetingTypeText(meeting.meeting_type)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(meeting.meeting_date),
                              "PPP p"
                            )}
                          </TableCell>
                          <TableCell>{meeting.location}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                                meeting.status || "cancelled"
                              )}`}
                            >
                              {(meeting.status || "cancelled").charAt(0).toUpperCase() +
                                (meeting.status || "cancelled").slice(1)}
                            </span>
                          </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 gap-1"
                                  onClick={() => handleDeleteMeeting(meeting.id)}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                  Delete
                                </Button>
                              </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    {meetings.filter(
                      (meeting) => meeting.status === "cancelled"
                    ).length === 0 && (
                      <TableRow>
                        <TableCell
                            colSpan={6}
                            className="text-center py-8 text-muted-foreground"
                        >
                            <div className="flex flex-col items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                          No cancelled meetings
                            </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={minutesDialogOpen} onOpenChange={setMinutesDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
              {currentMeeting ? "Meeting Minutes" : "Add Meeting Minutes"}
            </DialogTitle>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{currentMeeting?.title}</span>
                <span className="text-muted-foreground">-</span>
                <span>{currentMeeting && format(new Date(currentMeeting.meeting_date), "PPP p")}</span>
              </div>
              {currentMeeting && (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMeetingTypeColor(
                  currentMeeting.meeting_type
                )}`}>
                  {getMeetingTypeText(currentMeeting.meeting_type)}
                </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    Location: {currentMeeting.location}
                  </span>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="meeting-attendees" className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  Meeting Attendees
                </Label>
                <div className="flex flex-wrap gap-2">
                  {minutes.attendees.map((attendee, index) => (
                    <div key={index} className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md">
                      <span>{attendee}</span>
                      <button
                        onClick={() => {
                          setMinutes(prev => ({
                            ...prev,
                            attendees: prev.attendees.filter((_, i) => i !== index)
                          }));
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Add attendee"
                      className="h-8"
                      onKeyDown={(e) => {
                        const target = e.target as HTMLInputElement;
                        if (e.key === 'Enter' && target.value) {
                          setMinutes(prev => ({
                            ...prev,
                            attendees: [...prev.attendees, target.value]
                          }));
                          target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="meeting-attachments" className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-paperclip"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  Attachments
                </Label>
                <div className="flex flex-wrap gap-2">
                  {minutes.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span>{attachment.name}</span>
                      <button
                        onClick={() => {
                          setMinutes(prev => ({
                            ...prev,
                            attachments: prev.attachments.filter((_, i) => i !== index)
                          }));
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement)?.files?.[0];
                        if (file) {
                          setMinutes(prev => ({
                            ...prev,
                            attachments: [...prev.attachments, { name: file.name, file }]
                          }));
                        }
                      };
                      input.click();
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus mr-1"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    Add File
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="meeting-topics" className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
                Meeting Topics
              </Label>
            <Textarea
                id="meeting-topics"
                value={minutes.topics || ""}
                onChange={(e) => setMinutes(prev => ({ ...prev, topics: e.target.value }))}
                placeholder="List the main topics discussed in the meeting..."
                className="min-h-[100px] resize-y"
            />
          </div>
            
            <div className="grid gap-2">
              <Label htmlFor="meeting-discussions" className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Discussions
              </Label>
              <Textarea
                id="meeting-discussions"
                value={minutes.discussions || ""}
                onChange={(e) => setMinutes(prev => ({ ...prev, discussions: e.target.value }))}
                placeholder="Detail the discussions and points raised for each topic..."
                className="min-h-[200px] resize-y"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="meeting-conclusions" className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Conclusions & Decisions
              </Label>
              <Textarea
                id="meeting-conclusions"
                value={minutes.conclusions || ""}
                onChange={(e) => setMinutes(prev => ({ ...prev, conclusions: e.target.value }))}
                placeholder="Summarize the conclusions, decisions made, and action items..."
                className="min-h-[150px] resize-y"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="meeting-action-items" className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard-list"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
                Action Items
              </Label>
              <div className="space-y-2">
                {minutes.actionItems.map((item, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-secondary rounded-md">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => {
                        setMinutes(prev => ({
                          ...prev,
                          actionItems: prev.actionItems.map((actionItem, i) => 
                            i === index ? { ...actionItem, completed: e.target.checked } : actionItem
                          )
                        }));
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Input
                        value={item.task}
                        onChange={(e) => {
                          setMinutes(prev => ({
                            ...prev,
                            actionItems: prev.actionItems.map((actionItem, i) => 
                              i === index ? { ...actionItem, task: e.target.value } : actionItem
                            )
                          }));
                        }}
                        placeholder="Enter action item"
                        className="mb-1"
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          value={item.assignee}
                          onChange={(e) => {
                            setMinutes(prev => ({
                              ...prev,
                              actionItems: prev.actionItems.map((actionItem, i) => 
                                i === index ? { ...actionItem, assignee: e.target.value } : actionItem
                              )
                            }));
                          }}
                          placeholder="Assignee"
                          className="h-8"
                        />
                        <Input
                          type="date"
                          value={item.dueDate}
                          onChange={(e) => {
                            setMinutes(prev => ({
                              ...prev,
                              actionItems: prev.actionItems.map((actionItem, i) => 
                                i === index ? { ...actionItem, dueDate: e.target.value } : actionItem
                              )
                            }));
                          }}
                          className="h-8"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setMinutes(prev => ({
                          ...prev,
                          actionItems: prev.actionItems.filter((_, i) => i !== index)
                        }));
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setMinutes(prev => ({
                      ...prev,
                      actionItems: [...prev.actionItems, { task: '', assignee: '', dueDate: '', completed: false }]
                    }));
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus mr-1"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  Add Action Item
                </Button>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="meeting-notes" className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                Additional Notes
              </Label>
              <Textarea
                id="meeting-notes"
                value={minutes.notes || ""}
                onChange={(e) => setMinutes(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes or observations..."
                className="min-h-[100px] resize-y"
              />
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
            <Button variant="outline" onClick={() => setMinutesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMinutes}>
              {hasMeetingMinutes(currentMeeting) ? "Update Minutes" : "Save Minutes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 