"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Percent, DollarSign, Star, AlertCircle } from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { BillComponent } from "../../../../types/bills";
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
import { Switch } from "../../../../components/ui/switch";
import { Textarea } from "../../../../components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "../../../../components/ui/alert";
import { Badge } from "../../../../components/ui/badge";

export default function BillComponentsPage() {
  const [components, setComponents] = useState<BillComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<BillComponent | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_percentage: false,
    is_required: true,
    default_amount: "",
  });
  const router = useRouter();

  useEffect(() => {
    fetchComponents();
  }, []);

  const fetchComponents = async () => {
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

      // Fetch components for this society
      const { data: componentsData, error: componentsError } = await supabase
        .from("bill_components")
        .select("*")
        .eq("society_id", adminData.society_id)
        .order("created_at", { ascending: false });

      if (componentsError) throw componentsError;
      setComponents(componentsData || []);
    } catch (error) {
      console.error("Error fetching components:", error);
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

      const componentData = {
        ...formData,
        society_id: adminData.society_id,
        default_amount: formData.default_amount ? parseFloat(formData.default_amount) : null,
      };

      if (selectedComponent) {
        // Update existing component
        const { error } = await supabase
          .from("bill_components")
          .update(componentData)
          .eq("id", selectedComponent.id);

        if (error) throw error;
      } else {
        // Create new component
        const { error } = await supabase
          .from("bill_components")
          .insert([componentData]);

        if (error) throw error;
      }

      // Refresh components list
      await fetchComponents();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving component:", error);
    }
  };

  const handleEdit = (component: BillComponent) => {
    setSelectedComponent(component);
    setFormData({
      name: component.name,
      description: component.description || "",
      is_percentage: component.is_percentage,
      is_required: component.is_required,
      default_amount: component.default_amount?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (componentId: string) => {
    if (!confirm("Are you sure you want to delete this component?")) return;

    try {
      const { error } = await supabase
        .from("bill_components")
        .delete()
        .eq("id", componentId);

      if (error) throw error;
      await fetchComponents();
    } catch (error) {
      console.error("Error deleting component:", error);
    }
  };

  const resetForm = () => {
    setSelectedComponent(null);
    setFormData({
      name: "",
      description: "",
      is_percentage: false,
      is_required: true,
      default_amount: "",
    });
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
          <h2 className="text-2xl font-semibold tracking-tight">Bill Components</h2>
          <p className="text-muted-foreground">
            Create and manage charge components for maintenance bills
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Component
        </Button>
      </div>

      {components.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No components yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first bill component to start generating bills
          </p>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Component
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {components.map((component) => (
            <Card key={component.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {component.is_percentage ? (
                    <Percent className="h-5 w-5 text-primary" />
                  ) : (
                    <DollarSign className="h-5 w-5 text-primary" />
                  )}
                  <span className="truncate">{component.name}</span>
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {component.is_required ? (
                    <Badge variant="default" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Required
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Optional
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                {component.description && (
                  <div className="text-sm">
                    <Label className="text-xs">Description</Label>
                    <p className="text-muted-foreground line-clamp-2">
                      {component.description}
                    </p>
                  </div>
                )}
                <div className="text-sm space-y-1">
                  <Label className="text-xs">Default Amount</Label>
                  <p className="text-muted-foreground flex items-center gap-1">
                    {component.is_percentage ? (
                      <>
                        <Percent className="h-3 w-3" />
                        {component.default_amount}%
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-3 w-3" />
                        ₹{component.default_amount || 0}
                      </>
                    )}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(component)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(component.id)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedComponent ? "Edit Component" : "Add Component"}
            </DialogTitle>
            <DialogDescription>
              Define a charge component for maintenance bills
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Component Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Maintenance Charge"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe what this component is for"
                  className="mt-1"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Percentage Based</Label>
                  <p className="text-sm text-muted-foreground">
                    Calculate amount as a percentage of base amount
                  </p>
                </div>
                <Switch
                  checked={formData.is_percentage}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_percentage: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Required Component</Label>
                  <p className="text-sm text-muted-foreground">
                    This component must be included in all bills
                  </p>
                </div>
                <Switch
                  checked={formData.is_required}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_required: checked })
                  }
                />
              </div>

              <div>
                <Label htmlFor="amount">
                  {formData.is_percentage ? "Default Percentage" : "Default Amount"}
                </Label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {formData.is_percentage ? (
                      <Percent className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <span className="text-muted-foreground">₹</span>
                    )}
                  </div>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.default_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, default_amount: e.target.value })
                    }
                    className="pl-8"
                    placeholder={formData.is_percentage ? "e.g. 18" : "e.g. 1000"}
                  />
                </div>
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
                {selectedComponent ? "Update Component" : "Add Component"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 