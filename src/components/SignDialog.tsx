import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileKey2, CheckCircle2, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  onSigned: () => void;
}

/** Имитация подписания ЭЦП */
export function SignDialog({ open, onOpenChange, title, onSigned }: Props) {
  const [stage, setStage] = useState<'choose' | 'signing' | 'done'>('choose');

  const sign = () => {
    setStage('signing');
    setTimeout(() => {
      setStage('done');
      setTimeout(() => {
        onSigned();
        onOpenChange(false);
        setStage('choose');
      }, 700);
    }, 900);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setStage('choose'); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileKey2 className="h-5 w-5 text-blue-700" />
            Подписание ЭЦП
          </DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>

        {stage === 'choose' && (
          <div className="space-y-3">
            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">Сертификат: Иванова Анна Петровна</div>
              <div className="text-muted-foreground text-xs mt-1">
                УЦ: АО «Национальный удостоверяющий центр» · действителен до 14.03.2027
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              После подписания данные будут направлены на согласование. Изменение без отзыва станет недоступно.
            </p>
          </div>
        )}
        {stage === 'signing' && (
          <div className="flex items-center gap-3 py-4 text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
            Формирование подписи…
          </div>
        )}
        {stage === 'done' && (
          <div className="flex items-center gap-3 py-4 text-sm text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            Документ подписан и отправлен
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={stage !== 'choose'}>
            Отмена
          </Button>
          <Button onClick={sign} disabled={stage !== 'choose'}>
            Подписать и отправить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
