"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, FileText, Landmark, Receipt, Loader2, QrCode } from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { BillTemplate } from "../../../../types/bills";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Textarea } from "../../../../components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "../../../../components/ui/alert";

export default function BillTemplatesPage() {
  const [templates, setTemplates] = useState<BillTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BillTemplate | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    header_text: "",
    footer_text: "",
    logo_url: "",
    bank_details: {
      bank_name: "",
      account_number: "",
      ifsc_code: "",
      account_name: "",
      payment_qr_url: "",
      payment_qr_file_name: "",
    },
    terms_and_conditions: [""],
  });
  const router = useRouter();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/auth/login");
        return;
      }

      // Get the society_id for the logged-in admin
      const { data: adminData, error: adminError } = await supabase
        .from("society_admins")
        .select("society_id")
        .eq("user_id", sessionData.session.user.id)
        .single();

      if (adminError) throw adminError;

      // Fetch templates for this society
      const { data: templatesData, error: templatesError } = await supabase
        .from("bill_templates")
        .select("*")
        .eq("society_id", adminData.society_id)
        .order("created_at", { ascending: false });

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/auth/login");
        return;
      }

      // Get society_id
      const { data: adminData } = await supabase
        .from("society_admins")
        .select("society_id")
        .eq("user_id", sessionData.session.user.id)
        .single();

      const templateData = {
        ...formData,
        society_id: adminData.society_id,
      };

      if (selectedTemplate) {
        // Update existing template
        const { error } = await supabase
          .from("bill_templates")
          .update(templateData)
          .eq("id", selectedTemplate.id);

        if (error) throw error;
      } else {
        // Create new template
        const { error } = await supabase
          .from("bill_templates")
          .insert([templateData]);

        if (error) throw error;
      }

      // Refresh templates list
      await fetchTemplates();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  const handleEdit = (template: BillTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      header_text: template.header_text || "",
      footer_text: template.footer_text || "",
      logo_url: template.logo_url || "",
      bank_details: template.bank_details ? {
        bank_name: template.bank_details.bank_name || "",
        account_number: template.bank_details.account_number || "",
        ifsc_code: template.bank_details.ifsc_code || "",
        account_name: template.bank_details.account_name || "",
        payment_qr_url: template.bank_details.payment_qr_url || "",
        payment_qr_file_name: template.bank_details.payment_qr_file_name || "",
      } : {
        bank_name: "",
        account_number: "",
        ifsc_code: "",
        account_name: "",
        payment_qr_url: "",
        payment_qr_file_name: "",
      },
      terms_and_conditions: template.terms_and_conditions || [""],
    });
    setIsDialogOpen(true);
  };

  const handleQrUpload = async (file: File) => {
    try {
      setUploadingQr(true);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push('/auth/login');
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from('society_admins')
        .select('society_id')
        .eq('user_id', sessionData.session.user.id)
        .single();

      if (adminError || !adminData?.society_id) {
        throw new Error(adminError?.message || 'Unable to resolve society ID');
      }

      const payload = new FormData();
      payload.append('file', file);
      payload.append('societyId', adminData.society_id);

      const response = await fetch('/api/bills/upload-payment-qr', {
        method: 'POST',
        body: payload,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload payment QR');
      }

      setFormData((prev) => ({
        ...prev,
        bank_details: {
          ...prev.bank_details,
          payment_qr_url: result.payment_qr_url,
          payment_qr_file_name: result.payment_qr_file_name || file.name,
        },
      }));
    } catch (error) {
      console.error('Error uploading payment QR:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload payment QR');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const { error } = await supabase
        .from("bill_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
      await fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  const resetForm = () => {
    setSelectedTemplate(null);
    setFormData({
      name: "",
      header_text: "",
      footer_text: "",
      logo_url: "",
      bank_details: {
        bank_name: "",
        account_number: "",
        ifsc_code: "",
        account_name: "",
        payment_qr_url: "",
        payment_qr_file_name: "",
      },
      terms_and_conditions: [""],
    });
  };

  const addTermAndCondition = () => {
    setFormData(prev => ({
      ...prev,
      terms_and_conditions: [...prev.terms_and_conditions, ""]
    }));
  };

  const updateTermAndCondition = (index: number, value: string) => {
    const newTerms = [...formData.terms_and_conditions];
    newTerms[index] = value;
    setFormData(prev => ({
      ...prev,
      terms_and_conditions: newTerms
    }));
  };

  const removeTermAndCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      terms_and_conditions: prev.terms_and_conditions.filter((_, i) => i !== index)
    }));
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
          <h2 className="text-2xl font-semibold tracking-tight">Bill Templates</h2>
          <p className="text-muted-foreground">
            Create and manage templates for generating maintenance bills
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No templates yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first bill template to start generating bills
          </p>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="truncate">{template.name}</span>
                </CardTitle>
                <CardDescription>
                  Last updated: {new Date(template.updated_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                {template.header_text && (
                  <div className="text-sm">
                    <Label className="text-xs">Header Text</Label>
                    <p className="text-muted-foreground line-clamp-2">{template.header_text}</p>
                  </div>
                )}
                {template.bank_details && (
                  <div className="text-sm space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Landmark className="h-3 w-3" />
                      Bank Details
                    </Label>
                    <p className="text-muted-foreground">
                      {template.bank_details.bank_name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      A/C: {template.bank_details.account_number}
                    </p>
                  </div>
                )}
                {template.terms_and_conditions && template.terms_and_conditions.length > 0 && (
                  <div className="text-sm">
                    <Label className="text-xs flex items-center gap-1">
                      <Receipt className="h-3 w-3" />
                      Terms & Conditions
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      {template.terms_and_conditions.length} terms defined
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(template)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              Define the template for generating maintenance bills
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Monthly Maintenance Bill"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="header">Header Text</Label>
                <Textarea
                  id="header"
                  value={formData.header_text}
                  onChange={(e) =>
                    setFormData({ ...formData, header_text: e.target.value })
                  }
                  placeholder="Enter header text to appear on all bills"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Bank Details</Label>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div>
                    <Input
                      placeholder="Bank Name"
                      value={formData.bank_details.bank_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bank_details: {
                            ...formData.bank_details,
                            bank_name: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Account Number"
                      value={formData.bank_details.account_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bank_details: {
                            ...formData.bank_details,
                            account_number: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="IFSC Code"
                      value={formData.bank_details.ifsc_code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bank_details: {
                            ...formData.bank_details,
                            ifsc_code: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Account Name"
                      value={formData.bank_details.account_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bank_details: {
                            ...formData.bank_details,
                            account_name: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="payment_qr" className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Payment QR
                  </Label>
                  <Input
                    id="payment_qr"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleQrUpload(file);
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a payment QR image to include it automatically in generated bill PDFs.
                  </p>

                  {uploadingQr && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading payment QR...
                    </div>
                  )}

                  {formData.bank_details.payment_qr_url && !uploadingQr && (
                    <div className="border rounded-md p-3 space-y-2">
                      <div className="text-xs text-muted-foreground">
                        Uploaded QR: {formData.bank_details.payment_qr_file_name || 'payment_qr'}
                      </div>
                      <img
                        src={formData.bank_details.payment_qr_url}
                        alt="Payment QR"
                        className="h-28 w-28 object-contain border rounded"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            bank_details: {
                              ...prev.bank_details,
                              payment_qr_url: '',
                              payment_qr_file_name: '',
                            },
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove QR
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Terms & Conditions</Label>
                <div className="space-y-2 mt-1">
                  {formData.terms_and_conditions.map((term, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={term}
                        onChange={(e) => updateTermAndCondition(index, e.target.value)}
                        placeholder={`Term ${index + 1}`}
                      />
                      {formData.terms_and_conditions.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeTermAndCondition(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTermAndCondition}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Term
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="footer">Footer Text</Label>
                <Textarea
                  id="footer"
                  value={formData.footer_text}
                  onChange={(e) =>
                    setFormData({ ...formData, footer_text: e.target.value })
                  }
                  placeholder="Enter footer text to appear on all bills"
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {selectedTemplate ? "Update Template" : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 