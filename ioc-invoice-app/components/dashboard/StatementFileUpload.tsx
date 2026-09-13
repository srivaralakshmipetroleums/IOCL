"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StatementFileUploadProps {
  accept: string;
  label: string;
  pendingLabel?: string;
  disabled?: boolean;
  onSelect: (file: File) => void;
}

export function StatementFileUpload({
  accept,
  label,
  pendingLabel = "Uploading...",
  disabled = false,
  onSelect,
}: StatementFileUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file);
          event.target.value = "";
        }}
      />
      <Button
        variant="outline"
        onClick={() => fileRef.current?.click()}
        disabled={disabled}
      >
        <Upload className="h-4 w-4" />
        {disabled ? pendingLabel : label}
      </Button>
    </>
  );
}
