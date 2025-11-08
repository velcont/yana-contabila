import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { JobPostingForm } from './JobPostingForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export const PostJobButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" size="lg">
          <PlusCircle className="h-5 w-5" />
          Postează Anunț "Caut Contabil"
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Postează Anunț - Caută Contabil</DialogTitle>
        </DialogHeader>
        <JobPostingForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};
