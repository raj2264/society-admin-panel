"use client";

import { useState } from "react";
import { useSupabase } from "@/lib/supabase-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FixSchemaPage() {
  const { supabase } = useSupabase();
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runMigration() {
    try {
      setLoading(true);
      setError(null);
      
      // SQL to create the new meeting_notes table
      const sql = `
      -- Create a new meeting notes table with a different name
      CREATE TABLE IF NOT EXISTS public.meeting_notes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
          note_content TEXT NOT NULL,
          created_by UUID REFERENCES auth.users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Add Row Level Security
      ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;
      
      -- Society admins can create meeting notes
      CREATE POLICY IF NOT EXISTS "Society admins can create meeting notes" ON public.meeting_notes
          FOR INSERT
          WITH CHECK (
              EXISTS (
                  SELECT 1 FROM public.society_admins sa
                  JOIN public.meetings m ON m.society_id = sa.society_id
                  WHERE m.id = meeting_notes.meeting_id
                  AND sa.user_id = auth.uid()
              )
          );
      
      -- Society admins can update meeting notes
      CREATE POLICY IF NOT EXISTS "Society admins can update meeting notes" ON public.meeting_notes
          FOR UPDATE
          USING (
              EXISTS (
                  SELECT 1 FROM public.society_admins sa
                  JOIN public.meetings m ON m.society_id = sa.society_id
                  WHERE m.id = meeting_notes.meeting_id
                  AND sa.user_id = auth.uid()
              )
          )
          WITH CHECK (
              EXISTS (
                  SELECT 1 FROM public.society_admins sa
                  JOIN public.meetings m ON m.society_id = sa.society_id
                  WHERE m.id = meeting_notes.meeting_id
                  AND sa.user_id = auth.uid()
              )
          );
      
      -- Society admins can view meeting notes
      CREATE POLICY IF NOT EXISTS "Society admins can view meeting notes" ON public.meeting_notes
          FOR SELECT
          USING (
              EXISTS (
                  SELECT 1 FROM public.society_admins sa
                  JOIN public.meetings m ON m.society_id = sa.society_id
                  WHERE m.id = meeting_notes.meeting_id
                  AND sa.user_id = auth.uid()
              )
          );
      
      -- Society residents can view meeting notes
      CREATE POLICY IF NOT EXISTS "Residents can view meeting notes" ON public.meeting_notes
          FOR SELECT
          USING (
              EXISTS (
                  SELECT 1 FROM public.residents r
                  JOIN public.meetings m ON m.society_id = r.society_id
                  WHERE m.id = meeting_notes.meeting_id
                  AND r.user_id = auth.uid()
              )
          );
      `;
      
      // Execute the SQL
      const { data, error: sqlError } = await supabase.rpc('exec_sql', { query: sql });
      
      if (sqlError) {
        console.error("SQL error:", sqlError);
        
        // Try a different approach if the RPC method doesn't exist
        try {
          // We need to create the table some other way
          // For now, just check if we can connect to the database
          const { error: directError } = await supabase
            .from('meetings')
            .select('id')
            .limit(1);
            
          if (directError) {
            setError(`SQL error: ${sqlError.message} and direct query error: ${directError.message}`);
            return;
          }
          
          setResult({ 
            success: true, 
            message: "Couldn't run migration SQL directly, but we can connect to the database. Please ask an administrator to run the SQL script to create the meeting_notes table." 
          });
        } catch (directErr: any) {
          setError(`SQL error: ${sqlError.message} and direct query error: ${directErr.message}`);
          return;
        }
      } else {
        setResult({ success: true, message: "New meeting_notes table created successfully!" });
      }
      
      // Now check if the new table exists
      try {
        const { data: tableInfo, error: infoError } = await supabase
          .from('meeting_notes')
          .select('id')
          .limit(1);
        
        if (infoError) {
          console.error("Error checking new table:", infoError);
          setResult((prev: any) => ({ 
            ...prev, 
            tableCheck: {
              success: false,
              error: infoError
            }
          }));
        } else {
          setResult((prev: any) => ({ 
            ...prev, 
            tableCheck: {
              success: true,
              message: "Table exists and is accessible"
            }
          }));
        }
      } catch (err: any) {
        console.error("Error checking table:", err);
      }
    } catch (err: any) {
      console.error("Migration error:", err);
      setError(`Migration error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Create Meeting Notes Table</h1>
      
      <div className="mb-6">
        <Button onClick={runMigration} disabled={loading}>
          {loading ? "Creating Table..." : "Create New Table"}
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Migration Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[500px]">
              <pre className="text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 