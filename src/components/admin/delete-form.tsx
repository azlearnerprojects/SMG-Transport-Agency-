'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Confirm-before-delete form wrapping a delete server action. Rendered inside
 * the per-record edit panels of the admin config pages.
 */
export function DeleteForm({
  action,
  id,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="label" value={label} />
      <Button type="submit" variant="destructive" size="sm">
        <Trash2 className="size-4" /> Delete
      </Button>
    </form>
  );
}
