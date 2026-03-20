"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toProxyUrl, buildProxyUrl } from "@/lib/storage-proxy";
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
  BarChart2,
  Calendar,
  CheckCircle2,
  Edit,
  Plus,
  PlusCircle,
  Trash2,
  XCircle,
  Upload,
  File,
  X,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";

interface Poll {
  id: string;
  title: string;
  description: string;
  created_at: string;
  expires_at: string | null;
  active: boolean;
  society_id: string;
}

interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  attachment_url?: string;
  attachment_name?: string;
  created_at: string;
}

interface PollVote {
  option_id: string;
  count: number;
}

export default function PollsPage() {
  const router = useRouter();
  
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollOptions, setPollOptions] = useState<Record<string, PollOption[]>>({});
  const [pollVotes, setPollVotes] = useState<Record<string, Record<string, number>>>({});
  const [totalVotes, setTotalVotes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [optionAttachments, setOptionAttachments] = useState<Record<number, { file: File | null, name: string }>>({});
  
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
        
        console.log("Current user ID:", data.session.user.id);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error checking auth:", error);
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router, supabase]);
  
  useEffect(() => {
    async function fetchPolls() {
      if (!isAuthenticated) return;
      
      try {
        setLoading(true);
        
        // Get society admin info
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          throw new Error(sessionError?.message || "Not authenticated");
        }
        
        // Get society id for current admin
        const { data: adminData, error: adminError } = await supabase
          .from("society_admins")
          .select("society_id")
          .eq("user_id", sessionData.session.user.id)
          .maybeSingle();
          
        if (adminError) {
          throw new Error(adminError.message || "Failed to get society info");
        }

        if (!adminData) {
          throw new Error("You are not associated with any society. Please contact support.");
        }
        
        // Get polls for this society
        const { data, error } = await supabase
          .from("polls")
          .select("*")
          .eq("society_id", adminData.society_id)
          .order("created_at", { ascending: false });
          
        if (error) {
          throw error;
        }
        
        // Get poll options
        if (data && data.length > 0) {
          const pollIds = data.map(poll => poll.id);
          
          // Fetch options for all polls
          const { data: optionsData, error: optionsError } = await supabase
            .from("poll_options")
            .select("*")
            .in("poll_id", pollIds);
            
          if (optionsError) {
            throw optionsError;
          }
          
          // Organize options by poll_id
          const optionsByPollId: Record<string, PollOption[]> = {};
          if (optionsData) {
            optionsData.forEach((option: PollOption) => {
              if (!optionsByPollId[option.poll_id]) {
                optionsByPollId[option.poll_id] = [];
              }
              optionsByPollId[option.poll_id].push(option);
            });
          }
          
          // Fetch vote counts - use a raw SQL query with group by
          const { data: votesData, error: votesError } = await supabase
            .rpc('get_poll_vote_counts', { poll_ids: pollIds });
            
          if (votesError) {
            throw votesError;
          }
          
          // Organize votes by poll_id and option_id
          const votesByPollId: Record<string, Record<string, number>> = {};
          const totalVotesByPollId: Record<string, number> = {};
          
          if (votesData) {
            votesData.forEach((vote: any) => {
              const pollId = vote.poll_id;
              const optionId = vote.option_id;
              const count = parseInt(vote.vote_count);
              
              if (!votesByPollId[pollId]) {
                votesByPollId[pollId] = {};
                totalVotesByPollId[pollId] = 0;
              }
              
              votesByPollId[pollId][optionId] = count;
              totalVotesByPollId[pollId] += count;
            });
          }
          
          setPollOptions(optionsByPollId);
          setPollVotes(votesByPollId);
          setTotalVotes(totalVotesByPollId);
        }
        
        setPolls(data || []);
      } catch (error: any) {
        toast.error("Error loading polls", {
          description: error.message,
        });
        console.error("Error loading polls:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchPolls();
  }, [refreshKey, supabase, isAuthenticated]);
  
  const handleAddOption = () => {
    setOptions([...options, ""]);
  };
  
  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      toast.error("A poll must have at least 2 options");
      return;
    }
    
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };
  
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };
  
  const handleFileChange = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only images (JPEG, PNG), PDFs, and Word documents are allowed");
      return;
    }

    setOptionAttachments(prev => ({
      ...prev,
      [index]: { file, name: file.name }
    }));
  };

  const removeAttachment = (index: number) => {
    setOptionAttachments(prev => {
      const newAttachments = { ...prev };
      delete newAttachments[index];
      return newAttachments;
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error("You must be logged in to create polls");
      router.push('/login');
      return;
    }
    
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    
    // Check that all options have text
    const validOptions = options.filter(option => option.trim() !== "");
    if (validOptions.length < 2) {
      toast.error("Please provide at least 2 valid options for the poll");
      return;
    }
    
    try {
      setLoading(true);
      
      // Get society admin info
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error(sessionError?.message || "Not authenticated");
      }
      
      // Get society id for current admin
      const { data: adminData, error: adminError } = await supabase
        .from("society_admins")
        .select("society_id")
        .eq("user_id", sessionData.session.user.id)
        .maybeSingle();
        
      if (adminError) {
        throw new Error(adminError.message || "Failed to get society info");
      }

      if (!adminData) {
        throw new Error("You are not associated with any society. Please contact support.");
      }
      
      // Create poll
      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .insert({
          society_id: adminData.society_id,
          title: title.trim(),
          description: description.trim(),
          created_by: sessionData.session.user.id,
          expires_at: expiryDate,
          active: true
        })
        .select();
      
      if (pollError || !pollData) {
        throw new Error(pollError?.message || "Failed to create poll");
      }
      
      const pollId = pollData[0].id;
      
      // Upload attachments and create poll options
      const optionsToInsert = await Promise.all(validOptions.map(async (option, index) => {
        const attachment = optionAttachments[index];
        let attachmentUrl = null;
        let attachmentName = null;

        if (attachment?.file) {
          const fileExt = attachment.file.name.split('.').pop();
          const fileName = `${pollId}/${index}-${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('poll-attachments')
            .upload(fileName, attachment.file);

          if (uploadError) {
            throw new Error(`Failed to upload attachment: ${uploadError.message}`);
          }

          attachmentUrl = buildProxyUrl('poll-attachments', fileName);
          attachmentName = attachment.file.name;
        }

        return {
          poll_id: pollId,
          option_text: option.trim(),
          attachment_url: attachmentUrl,
          attachment_name: attachmentName
        };
      }));
      
      const { error: optionsError } = await supabase
        .from("poll_options")
        .insert(optionsToInsert);
      
      if (optionsError) {
        throw new Error(optionsError.message);
      }
      
      toast.success("Poll created successfully", {
        description: "Residents will be notified about this new poll",
      });
      
      // Reset form
      setTitle("");
      setDescription("");
      setOptions(["", ""]);
      setExpiryDate(null);
      setOptionAttachments({});
      
      // Refresh poll list
      setRefreshKey(prevKey => prevKey + 1);
      
    } catch (error: any) {
      toast.error("Error creating poll", {
        description: error.message,
      });
      console.error("Error creating poll:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const togglePollStatus = async (poll: Poll) => {
    if (!isAuthenticated) {
      toast.error("You must be logged in to modify polls");
      router.push('/login');
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from("polls")
        .update({ active: !poll.active })
        .eq("id", poll.id);
        
      if (error) {
        throw error;
      }
      
      toast.success(
        poll.active 
          ? "Poll disabled successfully" 
          : "Poll activated successfully"
      );
      
      // Refresh polls list
      setRefreshKey(prevKey => prevKey + 1);
      
    } catch (error: any) {
      toast.error(`Error ${poll.active ? "disabling" : "activating"} poll`, {
        description: error.message,
      });
      console.error(`Error toggling poll status:`, error);
    } finally {
      setLoading(false);
    }
  };
  
  const deletePoll = async (pollId: string) => {
    if (!isAuthenticated) {
      toast.error("You must be logged in to delete polls");
      router.push('/login');
      return;
    }
    
    // Confirm deletion
    if (!window.confirm("Are you sure you want to delete this poll? This action cannot be undone.")) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Delete poll (cascade will delete options and votes automatically)
      const { error } = await supabase
        .from("polls")
        .delete()
        .eq("id", pollId);
        
      if (error) {
        throw error;
      }
      
      toast.success("Poll deleted successfully");
      
      // Refresh polls list
      setRefreshKey(prevKey => prevKey + 1);
      
    } catch (error: any) {
      toast.error("Error deleting poll", {
        description: error.message,
      });
      console.error("Error deleting poll:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const calculatePercentage = (pollId: string, optionId: string) => {
    const total = totalVotes[pollId] || 0;
    const count = pollVotes[pollId]?.[optionId] || 0;
    
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Community Polls</h1>
        <Toaster position="top-right" />
      </div>
      
      <p className="text-gray-500 dark:text-gray-400">
        Create and manage polls for your society members to vote on.
      </p>
      
      <Separator className="my-6" />
      
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Create New Poll</CardTitle>
              <CardDescription>
                Create a new poll for residents to vote on
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Poll Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Should we upgrade the playground?"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide more details about the poll..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Expiry Date (Optional)</Label>
                  <DatePicker
                    date={expiryDate}
                    setDate={setExpiryDate}
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Poll Options</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleAddOption}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Option
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {options.map((option, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveOption(index)}
                            disabled={options.length <= 2}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`attachment-${index}`}
                            className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                          >
                            <Upload className="h-4 w-4" />
                            Add Attachment
                          </Label>
                          <input
                            id={`attachment-${index}`}
                            type="file"
                            className="hidden"
                            onChange={(e) => handleFileChange(index, e)}
                            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                          />
                          
                          {optionAttachments[index] && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <File className="h-4 w-4" />
                              <span className="truncate max-w-[200px]">
                                {optionAttachments[index].name}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeAttachment(index)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Creating..." : "Create Poll"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">All Polls</h2>
          
          {loading && polls.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
          ) : polls.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <BarChart2 className="h-16 w-16 text-gray-400 mb-4" />
                <p className="text-center text-gray-500">
                  No polls created yet. Create your first poll to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {polls.map((poll) => (
                <Card key={poll.id} className={poll.active ? "" : "opacity-65"}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{poll.title}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant={poll.active ? "default" : "secondary"}>
                          {poll.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>
                      {new Date(poll.created_at).toLocaleDateString()}
                      {poll.expires_at && (
                        <span> · Expires: {new Date(poll.expires_at).toLocaleDateString()}</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {poll.description}
                    </p>
                    
                    <div className="space-y-3">
                      {pollOptions[poll.id]?.map((option) => (
                        <div key={option.id} className="space-y-1">
                          <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              <span>{option.option_text}</span>
                              {option.attachment_url && (
                                <a
                                  href={toProxyUrl(option.attachment_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
                                >
                                  <File className="h-4 w-4" />
                                  <span className="text-xs">
                                    {option.attachment_name}
                                  </span>
                                </a>
                              )}
                            </div>
                            <span className="font-medium">
                              {calculatePercentage(poll.id, option.id)}%
                              ({pollVotes[poll.id]?.[option.id] || 0} votes)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div
                              className="bg-primary h-2.5 rounded-full"
                              style={{
                                width: `${calculatePercentage(poll.id, option.id)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 text-sm text-gray-500">
                      Total votes: {totalVotes[poll.id] || 0}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => togglePollStatus(poll)}
                    >
                      {poll.active ? (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Disable
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => deletePoll(poll.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 