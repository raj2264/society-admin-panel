"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/lib/supabase-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestDbPage() {
  const { supabase } = useSupabase();
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function inspectTable() {
    try {
      setLoading(true);
      setError(null);
      
      // Try to get a single row from meeting_minutes to see its structure
      const { data: sampleData, error: sampleError } = await supabase
        .from('meeting_minutes')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.error("Error fetching sample:", sampleError);
        setError(`Error fetching sample: ${sampleError.message}`);
      } else {
        console.log("Sample data:", sampleData);
        
        // Get column names from the first row
        const columnNames = sampleData && sampleData.length > 0 
          ? Object.keys(sampleData[0]) 
          : [];
          
        setTableInfo({
          sampleData,
          columnNames
        });
      }
      
      // Try a direct SQL query as a fallback
      try {
        const { data: sqlData, error: sqlError } = await supabase.rpc(
          'exec_sql',
          { query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'meeting_minutes'" }
        );
        
        if (sqlError) {
          console.error("SQL query error:", sqlError);
        } else {
          console.log("SQL query result:", sqlData);
          if (!tableInfo) {
            setTableInfo({ sqlData });
          } else {
            setTableInfo(prev => ({ ...prev, sqlData }));
          }
        }
      } catch (sqlErr) {
        console.error("SQL execution error:", sqlErr);
      }
    } catch (err: any) {
      console.error("Inspection error:", err);
      setError(`Inspection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function testInsert() {
    try {
      setLoading(true);
      setError(null);
      
      // Get a meeting ID to use
      const { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('id')
        .limit(1);
      
      if (meetingsError || !meetings || meetings.length === 0) {
        setError("Could not find a meeting to use for testing");
        return;
      }
      
      const meetingId = meetings[0].id;
      
      // Try inserting with different column names
      const columnNames = ['content', 'text', 'minutes', 'note', 'description', 'body'];
      
      for (const columnName of columnNames) {
        const insertData: any = {
          meeting_id: meetingId
        };
        insertData[columnName] = `Test minutes using ${columnName} column`;
        
        console.log(`Trying insert with ${columnName}:`, insertData);
        
        const { data, error } = await supabase
          .from('meeting_minutes')
          .insert(insertData)
          .select();
        
        console.log(`Result for ${columnName}:`, { data, error });
        
        if (!error) {
          setTableInfo(prev => ({ 
            ...prev, 
            successfulColumn: columnName,
            insertedData: data
          }));
          break;
        }
      }
    } catch (err: any) {
      console.error("Test insert error:", err);
      setError(`Test insert error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Database Schema Inspector</h1>
      
      <div className="flex space-x-4 mb-6">
        <Button onClick={inspectTable} disabled={loading}>
          {loading ? "Loading..." : "Inspect meeting_minutes Table"}
        </Button>
        
        <Button onClick={testInsert} disabled={loading} variant="outline">
          {loading ? "Testing..." : "Test Insert"}
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {tableInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Table Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[500px]">
              <pre className="text-sm">
                {JSON.stringify(tableInfo, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 