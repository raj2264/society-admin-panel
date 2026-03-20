"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GuardForm } from "./GuardForm";
import { Guard } from "@/lib/supabase";

interface GuardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  societyId: string;
  guard?: Guard;
  onSuccess: () => void;
}

export function GuardFormDialog({ open, onOpenChange, societyId, guard, onSuccess }: GuardFormDialogProps) {
  const handleSuccess = () => {
    onOpenChange(false); // Close the dialog
    onSuccess(); // Trigger any additional success handling
  };

  const handleCancel = () => {
    onOpenChange(false); // Close the dialog
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{guard ? "Edit Guard" : "Register New Guard"}</DialogTitle>
          <DialogDescription>
            {guard 
              ? "Update the guard's information below." 
              : "Create a new guard account with login credentials."}
          </DialogDescription>
        </DialogHeader>
        <GuardForm
          societyId={societyId}
          guard={guard}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
} 