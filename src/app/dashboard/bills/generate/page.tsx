"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Send, Loader2, Calendar, Percent, DollarSign, Star, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { BillTemplate, BillComponent, BillGenerationRequest, BillGenerationLog } from "../../../../types/bills";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Switch } from "../../../../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface GeneratedBill {
  id: string;
}

export default function GenerateBillsPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [templates, setTemplates] = useState<BillTemplate[]>([]);
  const [components, setComponents] = useState<BillComponent[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedComponents, setSelectedComponents] = useState<{
    [key: string]: { selected: boolean; amount?: number };
  }>({});
  const [billDate, setBillDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState(
    format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
  );
  const [lateFeePercentage, setLateFeePercentage] = useState("2");
  const [sendImmediately, setSendImmediately] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/auth/login");
        return;
      }

      // Get society_id
      const { data: adminData, error: adminError } = await supabase
        .from("society_admins")
        .select("society_id")
        .eq("user_id", sessionData.session.user.id)
        .single();

      if (adminError) throw adminError;

      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from("bill_templates")
        .select("*")
        .eq("society_id", adminData.society_id)
        .order("created_at", { ascending: false });

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Fetch components
      const { data: componentsData, error: componentsError } = await supabase
        .from("bill_components")
        .select("*")
        .eq("society_id", adminData.society_id)
        .order("name", { ascending: true });

      if (componentsError) throw componentsError;
      
      // Initialize selected components state
      const initialSelectedComponents: { [key: string]: { selected: boolean; amount?: number } } = {};
      componentsData?.forEach((component: BillComponent) => {
        initialSelectedComponents[component.id] = {
          selected: component.is_required,
          amount: component.default_amount,
        };
      });
      
      setComponents(componentsData || []);
      setSelectedComponents(initialSelectedComponents);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load templates and components");
    } finally {
      setLoading(false);
    }
  };

  const checkGenerationStatus = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { data: adminData } = await supabase
        .from("society_admins")
        .select("society_id")
        .eq("user_id", sessionData.session.user.id)
        .single();

      if (!adminData) return;

      // Get the most recent log
      const { data: logs, error: logsError } = await supabase
        .from("bill_generation_logs")
        .select("*")
        .eq("society_id", adminData.society_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (logsError) throw logsError;

      const latestLog = logs?.[0];
      if (!latestLog) return;

      if (latestLog.status === 'in_progress') {
        setError("Bills are being generated. Please wait...");
      } else if (latestLog.status === 'failed') {
        const errorMessages = latestLog.error_logs?.map((log: { resident_id: string; error: string }) => 
          `Resident ID ${log.resident_id}: ${log.error}`
        ).join('\n');
        setError(`Bill generation failed: ${errorMessages || 'Unknown error'}`);
      } else if (latestLog.status === 'completed') {
        setError(null);
        if (latestLog.successful_bills > 0) {
          setSuccess(`Successfully generated ${latestLog.successful_bills} bills`);
        }
      }
    } catch (error) {
      console.error("Error checking generation status:", error);
    }
  };

  const handleGenerateBills = async () => {
    try {
      // Clear any existing messages
      setError(null);
      setSuccess(null);
      setGenerating(true);

      // Validate inputs
      if (!selectedTemplate) {
        setError("Please select a template");
        return;
      }

      if (!billDate) {
        setError("Please select a bill date");
        return;
      }

      if (!dueDate) {
        setError("Please select a due date");
        return;
      }

      const selectedComponentsList = Object.entries(selectedComponents)
        .filter(([_, value]) => value.selected)
        .map(([id, value]) => ({
          id,
          amount: value.amount,
        }));

      if (selectedComponentsList.length === 0) {
        setError("Please select at least one bill component");
        return;
      }

      const generationRequest: BillGenerationRequest = {
        template_id: selectedTemplate,
        bill_date: billDate,
        due_date: dueDate,
        components: selectedComponentsList,
        late_fee_percentage: parseFloat(lateFeePercentage),
        send_immediately: sendImmediately,
      };

      // Get society_id
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: adminData } = await supabase
        .from("society_admins")
        .select("society_id, id")
        .eq("user_id", sessionData!.session!.user.id)
        .single();

      // Create generation log
      const { data: logData, error: logError } = await supabase
        .from("bill_generation_logs")
        .insert([{
          society_id: adminData.society_id,
          admin_id: adminData.id,
          generation_date: billDate,
          total_bills: 0,
          successful_bills: 0,
          failed_bills: 0,
          status: "in_progress",
        }])
        .select()
        .single();

      if (logError) throw logError;

      // Call the bill generation function
      const { data, error } = await supabase
        .rpc("generate_maintenance_bills", {
          p_generation_log_id: logData.id,
          p_template_id: generationRequest.template_id,
          p_bill_date: generationRequest.bill_date,
          p_due_date: generationRequest.due_date,
          p_components: generationRequest.components,
          p_late_fee_percentage: generationRequest.late_fee_percentage,
          p_send_immediately: generationRequest.send_immediately,
        });

      if (error) throw error;

      setSuccess(
        `Initiating bill generation for ${data.total_residents} residents...`
      );

      // Get the newly created bill IDs
      const { data: newBills, error: billsError } = await supabase
        .from("maintenance_bills")
        .select("id")
        .eq("society_id", adminData.society_id)
        .eq("bill_date", billDate)
        .is("pdf_url", null);

      if (billsError) throw billsError;

      if (newBills && newBills.length > 0) {
        // Generate PDFs for all new bills
        const billIds = newBills.map((bill: GeneratedBill) => bill.id);
        const response = await fetch('/api/bills/auto-generate-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ billIds }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error generating PDFs:', errorData);
        } else {
          const pdfResults = await response.json();
          console.log('PDF generation results:', pdfResults);
          setSuccess(
            `Successfully generated ${data.total_residents} bills with PDFs`
          );
        }
      }

    } catch (error) {
      console.error("Error generating bills:", error);
      setError(error instanceof Error ? error.message : "Failed to generate bills");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Generate Bills</h2>
          <p className="text-muted-foreground">
            Generate maintenance bills for all residents
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Bill Settings
            </CardTitle>
            <CardDescription>
              Configure the settings for generating maintenance bills
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Select Template</Label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bill Date</Label>
                <Input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Late Fee Percentage</Label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  type="number"
                  value={lateFeePercentage}
                  onChange={(e) => setLateFeePercentage(e.target.value)}
                  className="pl-8"
                  placeholder="e.g. 2"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Send Immediately</Label>
                <p className="text-sm text-muted-foreground">
                  Send bills to residents via email after generation
                </p>
              </div>
              <Switch
                checked={sendImmediately}
                onCheckedChange={setSendImmediately}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Bill Components
            </CardTitle>
            <CardDescription>
              Select and configure the components to include in the bills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {components.map((component: BillComponent) => {
                return (
                  <div key={component.id} className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label>{component.name}</Label>
                          {component.is_required && (
                            <Badge variant="default" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Required
                            </Badge>
                          )}
                        </div>
                        {component.description && (
                          <p className="text-sm text-muted-foreground">
                            {component.description}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={selectedComponents[component.id]?.selected ?? false}
                        onCheckedChange={(checked) =>
                          setSelectedComponents({
                            ...selectedComponents,
                            [component.id]: {
                              ...selectedComponents[component.id],
                              selected: checked,
                            },
                          })
                        }
                        disabled={component.is_required}
                      />
                    </div>
                    {selectedComponents[component.id]?.selected && (
                      <div className="pl-6 border-l">
                        <Label className="text-sm">
                          {component.is_percentage ? "Percentage" : "Amount"}
                        </Label>
                        <div className="relative mt-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            {component.is_percentage ? (
                              <Percent className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <span className="text-muted-foreground">₹</span>
                            )}
                          </div>
                          <Input
                            type="number"
                            value={selectedComponents[component.id]?.amount ?? component.default_amount ?? ""}
                            onChange={(e) =>
                              setSelectedComponents({
                                ...selectedComponents,
                                [component.id]: {
                                  ...selectedComponents[component.id],
                                  amount: parseFloat(e.target.value),
                                },
                              })
                            }
                            className="pl-8"
                            placeholder={
                              component.is_percentage
                                ? "Enter percentage"
                                : "Enter amount"
                            }
                          />
                        </div>
                      </div>
                    )}
                    <Separator />
                  </div>
                );
              })}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end pt-6">
            <Button
              onClick={handleGenerateBills}
              disabled={generating}
              className="w-full sm:w-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Bills...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Generate Bills
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 