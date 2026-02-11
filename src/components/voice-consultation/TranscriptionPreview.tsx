import { ChevronDown, FileText } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface TranscriptionPreviewProps {
  transcription: string | null;
}

export function TranscriptionPreview({ transcription }: TranscriptionPreviewProps) {
  if (!transcription) return null;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="transcription" className="border rounded-lg">
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Transcrição Bruta</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="bg-muted/30 rounded-lg p-4 max-h-64 overflow-y-auto">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {transcription}
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
