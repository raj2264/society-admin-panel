"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { GuardFormDialog } from "@/components/guards/GuardFormDialog";
import { useSupabase } from "@/lib/supabase-provider";
import { Guard } from "@/lib/supabase";
import { ChevronDown, MoreHorizontal, Plus, RefreshCcw, UserPlus, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function GuardsPage() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSociety, setSelectedSociety] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState<Guard | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const { supabase, session } = useSupabase();
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    if (session && session.user) {
      fetchSocietyData();
    }
  }, [session]);

  useEffect(() => {
    if (selectedSociety) {
      setPage(0);
      fetchGuards(0);
    }
  }, [selectedSociety, searchTerm]);

  const fetchSocietyData = async () => {
    try {
      const { data, error } = await supabase
        .from('society_admins')
        .select('society_id')
        .eq('user_id', session?.user?.id)
        .single();

      if (error) {
        console.error('Error fetching society:', error);
        return;
      }

      if (data) {
        setSelectedSociety(data.society_id);
      }
    } catch (error) {
      console.error('Error fetching society data:', error);
    }
  };

  const fetchGuards = async (pageNum: number = 0) => {
    if (!selectedSociety) return;

    setLoading(true);
    try {
      const { data, count, error } = await supabase
        .from('guards')
        .select('*', { count: 'exact' })
        .eq('society_id', selectedSociety)
        .ilike('name', `%${searchTerm}%`)
        .order('name')
        .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);

      if (error) {
        throw error;
      }

      setHasMore((data?.length || 0) >= ITEMS_PER_PAGE);

      if (pageNum === 0) {
        setGuards(data || []);
      } else {
        setGuards([...guards, ...(data || [])]);
      }
    } catch (error) {
      console.error('Error fetching guards:', error);
      toast.error('Failed to load guards');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGuard = () => {
    setSelectedGuard(undefined);
    setDialogOpen(true);
  };

  const handleEditGuard = (guard: Guard) => {
    setSelectedGuard(guard);
    setDialogOpen(true);
  };

  const handleDeleteGuard = async (guardId: string) => {
    if (!confirm('Are you sure you want to delete this guard? This will also delete their login account.')) {
      return;
    }

    try {
      const response = await fetch(`/api/guards/${guardId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete guard');
      }

      toast.success('Guard successfully deleted');
      fetchGuards();
    } catch (error) {
      console.error('Error deleting guard:', error);
      toast.error('Failed to delete guard');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Guards Management</CardTitle>
            <CardDescription>Register and manage security guards for your society</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setPage(0); fetchGuards(0); }}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={handleAddGuard}>
              <UserPlus className="h-4 w-4 mr-2" />
              Register Guard
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search guards by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {loading && page === 0 ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : guards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No guards have been registered yet</p>
              <Button onClick={handleAddGuard}>
                <Plus className="h-4 w-4 mr-2" />
                Register Your First Guard
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guards.map((guard) => (
                    <TableRow key={guard.id}>
                      <TableCell className="font-medium">{guard.name}</TableCell>
                      <TableCell>{guard.email}</TableCell>
                      <TableCell>{guard.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(guard.status || "")}>
                          {guard.status || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditGuard(guard)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteGuard(guard.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {hasMore && guards.length > 0 && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPage(page + 1);
                      fetchGuards(page + 1);
                    }}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Load More Guards"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <GuardFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        societyId={selectedSociety || ""}
        guard={selectedGuard}
        onSuccess={() => { setPage(0); fetchGuards(0); }}
      />
    </div>
  );
} 