import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface DashboardStats {
  totalResidents: number;
  totalStaff: number;
  pendingApprovals: number;
  totalComplaints: number;
  announcements: any[];
}

export function useDashboardStats(societyId: string | undefined, adminEmail: string | undefined) {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', societyId],
    queryFn: async () => {
      if (!societyId) {
        throw new Error('Society ID is required');
      }

      // Fetch all stats in parallel using the singleton client
      const [residentsRes, staffRes, pendingRes, complaintsRes, announcementsRes] = await Promise.all([
        supabase
          .from('residents')
          .select('id', { count: 'exact', head: true })
          .eq('society_id', societyId),
        supabase
          .from('society_staff')
          .select('id', { count: 'exact', head: true })
          .eq('society_id', societyId),
        supabase
          .from('approval_requests')
          .select('id', { count: 'exact', head: true })
          .eq('society_id', societyId)
          .eq('status', 'pending'),
        supabase
          .from('complaints')
          .select('id', { count: 'exact', head: true })
          .eq('society_id', societyId),
        supabase
          .from('announcements')
          .select('id, title, content, created_at, is_important, active')
          .eq('society_id', societyId)
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      return {
        totalResidents: residentsRes.count || 0,
        totalStaff: staffRes.count || 0,
        pendingApprovals: pendingRes.count || 0,
        totalComplaints: complaintsRes.count || 0,
        announcements: announcementsRes.data || [],
      };
    },
    enabled: !!societyId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}
