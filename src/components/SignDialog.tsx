import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  onSigned: () => void;
}

export function SignDialog({ open, onOpenChange, onSigned }: Props) {
  const [stage, setStage] = useState<'sending' | 'done'>('sending');

  useEffect(() => {
    if (open) {
      setStage('sending');
      const t1 = setTimeout(() => {
        setStage('done');
        onSigned();
      }, 500);
      const t2 = setTimeout(() => {
        onOpenChange(false);
      }, 1500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [open, onSigned, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm [&>button]:hidden">
        {stage === 'sending' ? (
          <div className="flex flex-col items-center justify-center py-6 gap-4">
             <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
             <div className="text-sm">Отправка…</div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 gap-4">
             <CheckCircle2 className="h-8 w-8 text-green-700" />
             <div className="text-sm font-medium">Отправлено успешно</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

