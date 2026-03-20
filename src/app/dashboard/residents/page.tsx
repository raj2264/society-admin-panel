"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { User, UserPlus, Pencil, Trash2, Search, X, Copy, Check, FileText, Upload, Download, AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import Link from "next/link";
import DocumentUploader from "../../../components/DocumentUploader";
import DocumentList from "../../../components/DocumentList";

interface Resident {
  id: string;
  email: string;
  name: string;
  unit_number: string;
  phone: string;
  status: string;
  created_at: string;
  user_id?: string;
}

interface CsvRow {
  name: string;
  email: string;
  unit_number: string;
  phone: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function ResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "csv">("manual");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showDocumentUploader, setShowDocumentUploader] = useState(false);
  const [resettingPasswordId, setResettingPasswordId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 15;

  // CSV import state
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // New resident form data
  const [newResident, setNewResident] = useState({
    name: "",
    email: "",
    unit_number: "",
    phone: "",
    password: "",
  });

  // Auto-set password when phone changes
  useEffect(() => {
    if (newResident.phone) {
      setNewResident(prev => ({ ...prev, password: prev.phone }));
    }
  }, [newResident.phone]);

  useEffect(() => {
    getSocietyId();
  }, []);

  useEffect(() => {
    if (societyId) {
      setPage(0);
      fetchResidents(0);
    }
  }, [societyId, searchTerm]);

  // Fetch the society ID of the logged-in admin
  async function getSocietyId() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: adminData, error } = await supabase
        .from("society_admins")
        .select("society_id")
        .eq("user_id", session.user.id)
        .single();
      
      if (error) {
        console.error("Error fetching society ID:", error);
        return;
      }
      setSocietyId(adminData.society_id);
    } catch (error) {
      console.error("Error getting society ID:", error);
    }
  }

  // Fetch residents for this society with pagination
  async function fetchResidents(pageNum: number = 0) {
    if (!societyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("residents")
        .select("*", { count: "exact" })
        .eq("society_id", societyId)
        .ilike("name", `%${searchTerm}%`)
        .order("created_at", { ascending: false })
        .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);
      
      if (error) {
        console.error("Error fetching residents:", error);
        return;
      }
      setHasMore((data?.length || 0) >= ITEMS_PER_PAGE);
      if (pageNum === 0) {
        setResidents(data || []);
      } else {
        setResidents([...residents, ...(data || [])]);
      }
    } catch (error) {
      console.error("Error in fetchResidents:", error);
    } finally {
      setLoading(false);
    }
  }

  // Function to copy text to clipboard
  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  // Download CSV template
  function downloadCsvTemplate() {
    const template = "name,email,unit_number,phone\nJohn Doe,john@example.com,A-101,9876543210\nJane Smith,jane@example.com,B-202,9123456789";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "residents_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Parse CSV file
  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setCsvErrors([]);
    setCsvData([]);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) {
        setCsvErrors(["CSV file must have a header row and at least one data row"]);
        return;
      }

      const header = lines[0].split(",").map(h => h.trim().toLowerCase());
      const requiredCols = ["name", "email", "unit_number"];
      const missing = requiredCols.filter(col => !header.includes(col));
      
      if (missing.length > 0) {
        setCsvErrors([`Missing required columns: ${missing.join(", ")}. Required: name, email, unit_number, phone`]);
        return;
      }

      const nameIdx = header.indexOf("name");
      const emailIdx = header.indexOf("email");
      const unitIdx = header.indexOf("unit_number");
      const phoneIdx = header.indexOf("phone");

      const rows: CsvRow[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim());
        const name = cols[nameIdx] || "";
        const email = cols[emailIdx] || "";
        const unit_number = cols[unitIdx] || "";
        const phone = phoneIdx >= 0 ? (cols[phoneIdx] || "") : "";

        if (!name || !email || !unit_number) {
          errors.push(`Row ${i + 1}: Missing required field (name, email, or unit_number)`);
          continue;
        }
        if (!email.includes("@") || !email.includes(".")) {
          errors.push(`Row ${i + 1}: Invalid email "${email}"`);
          continue;
        }
        if (!phone) {
          errors.push(`Row ${i + 1}: No phone for "${name}" — phone number is used as default password. A random password will be generated.`);
        }

        rows.push({ name, email: email.toLowerCase(), unit_number, phone });
      }

      setCsvData(rows);
      setCsvErrors(errors);
    };
    reader.readAsText(file);
  }

  // Import residents from CSV
  async function importCsvResidents() {
    if (!societyId || csvData.length === 0) return;

    setImporting(true);
    setImportProgress(0);
    setImportResult(null);

    const results: ImportResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const password = row.phone || Math.random().toString(36).slice(-10);

      try {
        const response = await fetch("/api/residents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: row.email,
            password,
            name: row.name,
            unit_number: row.unit_number,
            phone: row.phone,
            society_id: societyId,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          results.failed++;
          results.errors.push(`${row.name} (${row.email}): ${result.error}`);
        } else {
          results.success++;
        }
      } catch (err) {
        results.failed++;
        results.errors.push(`${row.name} (${row.email}): Network error`);
      }

      setImportProgress(Math.round(((i + 1) / csvData.length) * 100));
    }

    setImportResult(results);
    setImporting(false);

    // Refresh residents list
    if (results.success > 0) {
      setPage(0);
      fetchResidents(0);
    }
  }

  // Add single resident
  async function addResident(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    
    if (!newResident.name.trim() || !newResident.email.trim() || !newResident.unit_number.trim()) {
      setFormError("Name, email, and unit number are required");
      return;
    }
    
    if (!newResident.email.includes("@") || !newResident.email.includes(".")) {
      setFormError("Please enter a valid email address");
      return;
    }

    // Password is phone number by default; if no phone, require manual entry
    const password = newResident.password || newResident.phone;
    if (!password || password.length < 6) {
      setFormError("Password (default: phone number) must be at least 6 characters. Enter a phone number or set a custom password.");
      return;
    }
    
    if (!societyId) {
      setFormError("Unable to determine your society. Please refresh the page.");
      return;
    }
    
    setAdding(true);
    
    try {
      const response = await fetch("/api/residents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newResident.email.trim().toLowerCase(),
          password,
          name: newResident.name.trim(),
          unit_number: newResident.unit_number.trim(),
          phone: newResident.phone.trim(),
          society_id: societyId,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to create resident");
      }

      setFormSuccess(`Resident created! Login: ${newResident.email.trim().toLowerCase()} / Password: ${password}`);
      
      // Refresh list
      setPage(0);
      fetchResidents(0);
      
    } catch (error) {
      console.error("Error creating resident:", error);
      setFormError("Failed to create resident: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setAdding(false);
    }
  }

  // Delete a resident
  async function deleteResident(id: string) {
    if (!confirm("Are you sure you want to delete this resident?")) return;
    
    try {
      const { error } = await supabase
        .from("residents")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      setPage(0);
      fetchResidents(0);
    } catch (error) {
      console.error("Error deleting resident:", error);
      alert("Failed to delete resident. Please try again.");
    }
  }

  // Handle document upload
  function handleDocumentUploadComplete() {
    setShowDocumentUploader(false);
    // Reset to documents tab to show the newly uploaded documents
    setShowAddForm(false);
  }

  // Handle document deleted
  function handleDocumentDeleted() {
    // No need to do anything, the DocumentList component will refresh itself
  }

  // Reset a resident's password back to their phone number
  async function resetPassword(resident: Resident) {
    if (!resident.phone) {
      alert(`Cannot reset password: ${resident.name} has no phone number on file. Please update their phone number first.`);
      return;
    }

    const confirmed = confirm(
      `Reset password for ${resident.name}?\n\nTheir password will be reset to their phone number: ${resident.phone}\nThey will be required to change it on their next login.`
    );
    if (!confirmed) return;

    setResettingPasswordId(resident.id);
    try {
      const response = await fetch("/api/residents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resident_id: resident.id,
          action: "reset_password",
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to reset password");
      }

      alert(`Password for ${resident.name} has been reset to their phone number (${resident.phone}). They will need to change it on their next login.`);
    } catch (error) {
      console.error("Error resetting password:", error);
      alert("Failed to reset password: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setResettingPasswordId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Residents Management</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage residents in your society
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
          <Input
            placeholder="Search residents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <Button 
          onClick={() => {
            setShowAddForm(!showAddForm);
            setFormError(null);
            setFormSuccess(null);
            setImportResult(null);
            setCsvData([]);
            setCsvFileName(null);
            setCsvErrors([]);
            if (!showAddForm) {
              setNewResident({ name: "", email: "", unit_number: "", phone: "", password: "" });
              setAddMode("manual");
            }
          }}
          className="flex-shrink-0"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          {showAddForm ? "Cancel" : "Add Residents"}
        </Button>
      </div>

      {/* Add Resident Form */}
      {showAddForm && (
        <Card className="border-none shadow-lg bg-white dark:bg-gray-800 mb-8">
          <CardHeader>
            <CardTitle className="text-xl">Add Residents</CardTitle>
            <CardDescription>
              Add residents manually or import from a CSV file. Default login: email &amp; phone number as password. No email confirmation needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={addMode} onValueChange={(v) => setAddMode(v as "manual" | "csv")}>
              <TabsList className="mb-4">
                <TabsTrigger value="manual">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Manually
                </TabsTrigger>
                <TabsTrigger value="csv">
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </TabsTrigger>
              </TabsList>

              {/* ---- MANUAL TAB ---- */}
              <TabsContent value="manual">
                <form onSubmit={addResident} className="space-y-4">
                  {formError && (
                    <div className="p-3 text-sm rounded-md bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800/50 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>{formError}</div>
                    </div>
                  )}
                  
                  {formSuccess && (
                    <div className="p-3 text-sm rounded-md bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/50">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">Resident Created!</span>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded p-3 space-y-1 font-mono text-xs">
                        <div className="flex items-center justify-between">
                          <span>Email: {newResident.email}</span>
                          <Button type="button" variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyToClipboard(newResident.email, "resEmail")}>
                            {copiedField === "resEmail" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Password: {newResident.password || newResident.phone}</span>
                          <Button type="button" variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyToClipboard(newResident.password || newResident.phone, "resPass")}>
                            {copiedField === "resPass" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs mt-2 text-green-700 dark:text-green-500">No email confirmation needed — resident can login immediately.</p>
                      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => {
                        setFormSuccess(null);
                        setNewResident({ name: "", email: "", unit_number: "", phone: "", password: "" });
                      }}>
                        Add Another Resident
                      </Button>
                    </div>
                  )}

                  {!formSuccess && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name *</Label>
                          <Input
                            id="name"
                            value={newResident.name}
                            onChange={(e) => setNewResident({ ...newResident, name: e.target.value })}
                            placeholder="John Doe"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email (Login ID) *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newResident.email}
                            onChange={(e) => setNewResident({ ...newResident, email: e.target.value })}
                            placeholder="john@example.com"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="unit_number">Unit/Flat Number *</Label>
                          <Input
                            id="unit_number"
                            value={newResident.unit_number}
                            onChange={(e) => setNewResident({ ...newResident, unit_number: e.target.value })}
                            placeholder="A-101"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={newResident.phone}
                            onChange={(e) => {
                              const phone = e.target.value;
                              setNewResident(prev => ({ ...prev, phone, password: phone }));
                            }}
                            placeholder="9876543210"
                          />
                          <p className="text-xs text-muted-foreground">Phone number is used as the default login password</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              value={newResident.password}
                              onChange={(e) => setNewResident({ ...newResident, password: e.target.value })}
                              placeholder="Defaults to phone number"
                              className="font-mono pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                          </div>
                          <Button type="button" variant="outline" className="px-3" onClick={() => copyToClipboard(newResident.password, "formPass")}>
                            {copiedField === "formPass" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Auto-filled with phone number. Override if you want a custom password (min 6 chars).
                        </p>
                      </div>
                      <div className="flex justify-end space-x-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                        <Button type="submit" disabled={adding}>
                          {adding ? "Creating..." : "Create Resident"}
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              </TabsContent>

              {/* ---- CSV IMPORT TAB ---- */}
              <TabsContent value="csv">
                <div className="space-y-4">
                  {/* Template Download */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50">
                    <div>
                      <p className="font-medium text-sm">CSV Template</p>
                      <p className="text-xs text-muted-foreground">Download the template, fill in resident data, then upload it below.</p>
                      <p className="text-xs text-muted-foreground mt-1">Columns: <span className="font-mono">name, email, unit_number, phone</span></p>
                      <p className="text-xs text-muted-foreground">Phone number is used as default password for each resident.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>

                  {/* File Upload */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCsvUpload}
                    />
                    <Button
                      variant="outline"
                      className="w-full h-20 border-dashed"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center">
                        <Upload className="h-6 w-6 mb-1 text-muted-foreground" />
                        <span className="text-sm">{csvFileName || "Click to upload CSV file"}</span>
                      </div>
                    </Button>
                  </div>

                  {/* CSV Validation Errors */}
                  {csvErrors.length > 0 && (
                    <div className="p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-1">Warnings:</p>
                      <ul className="text-xs text-yellow-700 dark:text-yellow-500 space-y-1">
                        {csvErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* CSV Preview */}
                  {csvData.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">{csvData.length} resident(s) ready to import:</p>
                      <div className="rounded-lg border overflow-hidden max-h-60 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">#</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Email</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Unit</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Phone (Password)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {csvData.map((row, i) => (
                              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                                <td className="px-3 py-2">{row.name}</td>
                                <td className="px-3 py-2 text-gray-500">{row.email}</td>
                                <td className="px-3 py-2">{row.unit_number}</td>
                                <td className="px-3 py-2 font-mono text-xs">{row.phone || <span className="text-yellow-500 italic">random</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Import Progress */}
                  {importing && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Importing residents...</span>
                        <span>{importProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${importProgress}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Import Results */}
                  {importResult && (
                    <div className={`p-4 rounded-md border ${importResult.failed > 0 ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800" : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {importResult.failed > 0 ? <AlertCircle className="h-4 w-4 text-yellow-600" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        <span className="font-medium text-sm">
                          Import complete: {importResult.success} created, {importResult.failed} failed
                        </span>
                      </div>
                      {importResult.errors.length > 0 && (
                        <ul className="text-xs space-y-1 mt-2">
                          {importResult.errors.map((err, i) => (
                            <li key={i} className="text-red-600 dark:text-red-400">{err}</li>
                          ))}
                        </ul>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Each resident&apos;s login is their email, and their password is their phone number. No email confirmation needed.
                      </p>
                    </div>
                  )}

                  {/* Import Button */}
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                    <Button
                      onClick={importCsvResidents}
                      disabled={importing || csvData.length === 0}
                    >
                      {importing ? `Importing... (${importProgress}%)` : `Import ${csvData.length} Resident(s)`}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Residents List */}
      {loading && page === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading residents...</p>
        </div>
      ) : residents.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {residents.map((resident) => (
                  <tr key={resident.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{resident.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{resident.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{resident.unit_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{resident.phone || "-"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                        {resident.status || "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          asChild
                        >
                          <Link href={`/dashboard/residents/${resident.id}`}>
                            <FileText className="h-4 w-4 mr-1" />
                            <span className="hidden md:inline">View Profile</span>
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          onClick={() => resetPassword(resident)}
                          disabled={resettingPasswordId === resident.id}
                          title="Reset password to phone number"
                        >
                          <KeyRound className={`h-4 w-4 ${resettingPasswordId === resident.id ? 'animate-spin' : ''}`} />
                          <span className="hidden md:inline ml-1">{resettingPasswordId === resident.id ? 'Resetting...' : 'Reset Password'}</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => deleteResident(resident.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {hasMore && residents.length > 0 && (
            <div className="flex justify-center pt-4 pb-4">
              <Button
                variant="outline"
                onClick={() => {
                  setPage(page + 1);
                  fetchResidents(page + 1);
                }}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More Residents"}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
          {searchTerm ? (
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">No residents found matching "{searchTerm}"</p>
              <Button 
                variant="outline" 
                onClick={() => setSearchTerm("")}
                className="mx-auto"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div>
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Residents Added Yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by adding residents to your society</p>
              <Button 
                onClick={() => setShowAddForm(true)}
                className="mx-auto"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Your First Resident
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 