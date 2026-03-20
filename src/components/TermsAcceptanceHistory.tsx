import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Globe, Smartphone, FileText, X } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

interface TermsAcceptance {
  id: string;
  terms_version: string;
  accepted_at: string;
  ip_address: string | null;
  device_info: string | null;
}

interface TermsAcceptanceHistoryProps {
  userType: 'resident' | 'guard' | 'society_admin';
}

export default function TermsAcceptanceHistory({ userType }: TermsAcceptanceHistoryProps) {
  const [termsHistory, setTermsHistory] = useState<TermsAcceptance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<TermsAcceptance | null>(null);
  const [termsContent, setTermsContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTermsHistory();
  }, [userType]);

  const loadTermsHistory = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('No authenticated user found');
      }

      // Fetch terms acceptance history
      const { data, error } = await supabase
        .from('terms_acceptance')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('user_type', userType)
        .order('accepted_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTermsHistory(data || []);
    } catch (error) {
      console.error('Error loading terms history:', error);
      toast({
        title: "Error",
        description: "Failed to load terms acceptance history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTermsContent = async (version: string) => {
    try {
      setLoadingContent(true);
      setTermsContent(null);

      const { data, error } = await supabase
        .from('terms_versions')
        .select('content')
        .eq('version', version)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Terms content not found');
      }

      setTermsContent(data.content);
    } catch (error) {
      console.error('Error loading terms content:', error);
      toast({
        title: "Error",
        description: "Failed to load terms content",
        variant: "destructive",
      });
    } finally {
      setLoadingContent(false);
    }
  };

  const handleTermClick = async (term: TermsAcceptance) => {
    setSelectedTerm(term);
    await loadTermsContent(term.terms_version);
  };

  const closeDialog = () => {
    setSelectedTerm(null);
    setTermsContent(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (termsHistory.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No terms acceptance history found
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ScrollArea className="h-[400px]">
        <div className="space-y-4">
          {termsHistory.map((term) => (
            <Card 
              key={term.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleTermClick(term)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">
                    Version {term.terms_version}
                  </CardTitle>
                </div>
                <CardDescription>
                  {formatDate(term.accepted_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <span>IP Address: {term.ip_address || 'Not recorded'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Smartphone className="h-4 w-4" />
                    <span>Device: {term.device_info || 'Not recorded'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <Dialog open={!!selectedTerm} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DialogTitle>Terms & Conditions</DialogTitle>
                {selectedTerm && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                    v{selectedTerm.terms_version}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeDialog}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription>
              Accepted on {selectedTerm && formatDate(selectedTerm.accepted_at)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {loadingContent ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : termsContent ? (
              <ScrollArea className="h-full">
                <div className="p-6">
                  <div className="prose dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {termsContent}
                    </pre>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Failed to load terms content
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => selectedTerm && loadTermsContent(selectedTerm.terms_version)}
                >
                  Retry
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 