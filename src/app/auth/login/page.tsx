"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { ThemeToggle } from "../../../components/theme-toggle";
import { supabase } from "../../../lib/supabase";
import { TermsAndConditions } from '../../../components/TermsAndConditions';
import { useRouter } from 'next/navigation';

export default function SocietyAdminLoginPage() {
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [resetInProgress, setResetInProgress] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const router = useRouter();

  // Check if terms are already accepted
  useEffect(() => {
    const checkTermsAcceptance = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: termsData } = await supabase
            .from('terms_acceptance')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('user_type', 'society_admin')
            .single();
          
          if (termsData) {
            setTermsAccepted(true);
          }
        }
      } catch (error) {
        console.error('Error checking terms acceptance:', error);
      }
    };
    
    checkTermsAcceptance();
  }, []);

  const handleTermsAccept = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please login first to accept terms');
        return;
      }

      const { error: termsError } = await supabase
        .from('terms_acceptance')
        .insert({
          user_id: session.user.id,
          user_type: 'society_admin',
          terms_version: '1.0',
          ip_address: window.location.hostname,
          device_info: navigator.userAgent
        });

      if (termsError) {
        throw termsError;
      }

      setTermsAccepted(true);
      setShowTerms(false);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error accepting terms:', error);
      setError('Failed to accept terms. Please try again.');
    }
  };

  const handleTermsDecline = () => {
    setShowTerms(false);
    setError('You must accept the terms and conditions to use the platform.');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDebugInfo("Starting login process...");
    setLoginSuccess(false);

    try {
      // First try to find the admin by email in the society_admins table
      setDebugInfo((prev) => `${prev}\nLooking up admin with email: ${adminId.toLowerCase().trim()}`);
      const { data: adminData, error: lookupError } = await supabase
        .from("society_admins")
        .select("*")
        .eq("email", adminId.toLowerCase().trim())
        .single();

      if (lookupError || !adminData) {
        setDebugInfo((prev) => `${prev}\nError finding admin: ${lookupError?.message || "Admin ID not found"}`);
        throw new Error("Invalid admin ID or password");
      }

      // If we found the admin, now use their email to sign in
      setDebugInfo((prev) => `${prev}\nAdmin found, attempting to sign in with auth credentials`);
      const email = adminData.email;
      
      if (!email) {
        setDebugInfo((prev) => `${prev}\nNo email associated with this admin ID`);
        throw new Error("Authentication error: No email associated with this admin ID");
      }

      // Sign in with email/password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        setDebugInfo((prev) => `${prev}\nAuth error details: ${JSON.stringify(error, null, 2)}`);
        throw error;
      }

      // Check if terms are accepted
      const { data: termsData } = await supabase
        .from('terms_acceptance')
        .select('*')
        .eq('user_id', data.user.id)
        .eq('user_type', 'society_admin')
        .single();

      if (!termsData) {
        setShowTerms(true);
        return;
      }

      setTermsAccepted(true);
      setLoginSuccess(true);
      
      // Show success message briefly, then redirect automatically
      setDebugInfo((prev) => `${prev}\nLogin successful! Redirecting to dashboard automatically...`);
      
      // Automatic redirect after a brief delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (error) {
      console.error("Login error:", error);
      setError(error instanceof Error ? error.message : "An unexpected error occurred");
      setDebugInfo((prev) => `${prev}\nError during login: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200 p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400">MySocietyDetails</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Society Admin Panel</p>
      </div>

      {showTerms ? (
        <TermsAndConditions
          userType="society_admin"
          onAccept={handleTermsAccept}
          onDecline={handleTermsDecline}
        />
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the society admin panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
                  {error}
                </div>
              )}
              
              {debugInfo && process.env.NODE_ENV === 'development' && (
                <div className="p-3 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-md whitespace-pre-wrap">
                  {debugInfo}
                </div>
              )}

              {!loginSuccess && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="adminId" className="text-gray-700 dark:text-gray-300">Email Address</Label>
                    <Input
                      id="adminId"
                      type="email"
                      value={adminId}
                      onChange={(e) => setAdminId(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                      required
                    />
                  </div>
                </>
              )}
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            {!loginSuccess && (
              <>
                <Button
                  className="w-full"
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </Button>
                <Button
                  variant="link"
                  className="w-full"
                  onClick={() => setResetInProgress(true)}
                  disabled={loading || resetInProgress}
                >
                  Forgot Password?
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
} 