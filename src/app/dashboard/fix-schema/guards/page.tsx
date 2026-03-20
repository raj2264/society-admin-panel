"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// The SQL schema as a string instead of importing the file
const guardsSchema = `-- Guards Schema for Society Admin Panel

-- Create guards table if it doesn't exist
CREATE TABLE IF NOT EXISTS guards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  society_id UUID REFERENCES societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(email, society_id)
);

-- Enable Row Level Security
ALTER TABLE guards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Society admins can manage their society's guards" ON guards;
DROP POLICY IF EXISTS "Guards can view their own data" ON guards;

-- Create RLS policies for guards table
-- Society admins can manage guards in their society
CREATE POLICY "Society admins can manage their society's guards" ON guards
  USING (
    society_id IN (
      SELECT society_id FROM society_admins
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    society_id IN (
      SELECT society_id FROM society_admins
      WHERE user_id = auth.uid()
    )
  );

-- Guards can view their own data
CREATE POLICY "Guards can view their own data" ON guards
  FOR SELECT
  USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON guards TO authenticated;
`;

export default function ApplyGuardsSchema() {
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applySchema = async () => {
    setIsApplying(true);
    setResult(null);
    setError(null);

    try {
      // Call the server-side API to apply the schema
      const response = await fetch('/api/db/apply-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: guardsSchema }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply schema');
      }

      setResult('Guards schema applied successfully. The guards table has been created with proper RLS policies.');
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Apply Guards Schema</CardTitle>
          <CardDescription>
            This utility will create the guards table and set up appropriate Row Level Security policies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>
              This operation will:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Create a guards table if it doesn't exist</li>
              <li>Set up RLS policies for security</li>
              <li>Grant appropriate permissions to authenticated users</li>
            </ul>
            {result && (
              <div className="p-4 mt-4 bg-green-50 text-green-700 rounded-md">
                {result}
              </div>
            )}
            {error && (
              <div className="p-4 mt-4 bg-red-50 text-red-700 rounded-md">
                <p className="font-bold">Error:</p>
                <p>{error}</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={applySchema} 
            disabled={isApplying}
          >
            {isApplying ? 'Applying Schema...' : 'Apply Guards Schema'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 