"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Guard } from "@/lib/supabase";

// Form schema validation with zod
const guardFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().optional(),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }).optional(),
});

type GuardFormValues = z.infer<typeof guardFormSchema>;

interface GuardFormProps {
  societyId: string;
  guard?: Guard;
  onSuccess: () => void;
  onCancel: () => void;
}

export function GuardForm({ societyId, guard, onSuccess, onCancel }: GuardFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!guard;

  // Form default values
  const defaultValues: Partial<GuardFormValues> = {
    name: guard?.name || "",
    email: guard?.email || "",
    phone: guard?.phone || "",
    password: "",
  };

  const form = useForm<GuardFormValues>({
    resolver: zodResolver(guardFormSchema),
    defaultValues,
  });

  async function onSubmit(data: GuardFormValues) {
    try {
      setIsSubmitting(true);

      if (isEditing) {
        // Update existing guard
        const response = await fetch(`/api/guards/${guard.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: data.name,
            phone: data.phone,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update guard");
        }

        toast.success("Guard updated successfully");
      } else {
        // Create new guard
        const response = await fetch("/api/guards", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            phone: data.phone,
            password: data.password,
            societyId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to register guard");
        }

        toast.success("Guard registered successfully");
      }

      onSuccess();
    } catch (error) {
      console.error("Error submitting guard form:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Guard Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="guard@example.com" 
                  {...field} 
                  disabled={isEditing} // Email can't be edited
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Phone Number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isEditing && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="Password for guard login" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : isEditing ? "Update Guard" : "Register Guard"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 