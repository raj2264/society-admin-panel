"use client";

import { useState, useEffect } from "react";
import { getSecurityContacts, createSecurityContact, updateSecurityContact, deleteSecurityContact } from "@/lib/securityContacts";
import { SecurityContact } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Pencil, Trash2, Plus, Phone, Mail, MapPin, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

const contactTypes = [
  { value: "security", label: "Security Guard" },
  { value: "emergency", label: "Emergency Contact" },
  { value: "police", label: "Police" },
  { value: "fire", label: "Fire Department" },
  { value: "medical", label: "Medical Emergency" },
  { value: "other", label: "Other" },
];

export default function SecurityContactsPage() {
  const [user, setUser] = useState<any>(null);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<SecurityContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<SecurityContact | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    contact_type: "",
    phone: "",
    email: "",
    role: "",
    address: "",
    description: "",
  });

  useEffect(() => {
    getSocietyId();
  }, []);
  
  useEffect(() => {
    if (societyId) {
      loadContacts();
    }
  }, [societyId]);

  // Fetch the society ID of the logged-in admin
  async function getSocietyId() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;
      
      setUser(session.user);
      
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
  
  const loadContacts = async () => {
    if (!societyId) return;
    
    setLoading(true);
    try {
      const data = await getSecurityContacts(societyId);
      setContacts(data);
    } catch (error) {
      console.error("Error loading contacts:", error);
      toast({
        title: "Error",
        description: "Failed to load security contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, contact_type: value }));
  };
  
  const resetForm = () => {
    setFormData({
      name: "",
      contact_type: "",
      phone: "",
      email: "",
      role: "",
      address: "",
      description: "",
    });
    setEditingContact(null);
    setShowForm(false);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.contact_type || !formData.phone) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    if (!societyId) {
      toast({
        title: "Error",
        description: "Society ID not found. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (editingContact) {
        await updateSecurityContact(editingContact.id, {
          ...formData,
          society_id: societyId,
        });
        toast({
          title: "Success",
          description: "Contact updated successfully",
        });
      } else {
        await createSecurityContact({
          ...formData,
          society_id: societyId,
        });
        toast({
          title: "Success",
          description: "Contact added successfully",
        });
      }
      resetForm();
      loadContacts();
    } catch (error) {
      console.error("Error saving contact:", error);
      toast({
        title: "Error",
        description: "Failed to save contact",
        variant: "destructive",
      });
    }
  };
  
  const handleEdit = (contact: SecurityContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      contact_type: contact.contact_type,
      phone: contact.phone,
      email: contact.email || "",
      role: contact.role || "",
      address: contact.address || "",
      description: contact.description || "",
    });
    setShowForm(true);
  };
  
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      try {
        await deleteSecurityContact(id);
        toast({
          title: "Success",
          description: "Contact deleted successfully",
        });
        loadContacts();
      } catch (error) {
        console.error("Error deleting contact:", error);
        toast({
          title: "Error",
          description: "Failed to delete contact",
          variant: "destructive",
        });
      }
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Emergency Contacts</h1>
        <Button 
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "default"}
          className={showForm ? "dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600" : ""}
        >
          {showForm ? "Cancel" : "Add New Contact"}
        </Button>
      </div>
      
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Manage emergency contact information that will be visible to all residents in your society app.
      </p>
      
      {showForm && (
        <Card className="mb-8 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-3 border-b dark:border-gray-700">
            <CardTitle className="text-gray-800 dark:text-white">{editingContact ? "Edit Contact" : "Add New Contact"}</CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              {editingContact 
                ? "Update the contact information below" 
                : "Fill in the details to add a new emergency contact"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact_type" className="text-gray-700 dark:text-gray-300">Contact Type *</Label>
                  <Select
                    value={formData.contact_type}
                    onValueChange={handleSelectChange}
                    required
                  >
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      {contactTypes.map(type => (
                        <SelectItem key={type.value} value={type.value} className="dark:text-gray-200">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-700 dark:text-gray-300">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-gray-700 dark:text-gray-300">Role/Position</Label>
                  <Input
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-gray-700 dark:text-gray-300">Address/Location</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-700 dark:text-gray-300">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2 border-t dark:border-gray-700 pt-5">
              <Button variant="outline" type="button" onClick={resetForm} className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                Cancel
              </Button>
              <Button type="submit">
                {editingContact ? "Update Contact" : "Add Contact"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
      
      {loading ? (
        <div className="text-center py-8 text-gray-700 dark:text-gray-300">Loading...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No emergency contacts added yet</p>
          <Button onClick={() => setShowForm(true)} variant="outline" className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
            <Plus className="mr-2 h-4 w-4" />
            Add your first contact
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map(contact => (
            <Card key={contact.id} className="overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
              <CardHeader className="bg-gray-50 dark:bg-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {contactTypes.find(t => t.value === contact.contact_type)?.label || contact.contact_type}
                    </div>
                    <CardTitle className="mt-1 text-gray-800 dark:text-white">{contact.name}</CardTitle>
                  </div>
                  <div className="flex space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(contact)} className="dark:hover:bg-gray-600">
                      <Pencil className="h-4 w-4 dark:text-gray-300" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(contact.id)} className="dark:hover:bg-gray-600">
                      <Trash2 className="h-4 w-4 dark:text-gray-300" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{contact.phone}</span>
                  </div>
                  
                  {contact.email && (
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">{contact.email}</span>
                    </div>
                  )}
                  
                  {contact.role && (
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">{contact.role}</span>
                    </div>
                  )}
                  
                  {contact.address && (
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">{contact.address}</span>
                    </div>
                  )}
                </div>
                
                {contact.description && (
                  <>
                    <Separator className="my-3 dark:bg-gray-600" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">{contact.description}</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 