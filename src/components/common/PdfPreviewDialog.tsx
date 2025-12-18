import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, Loader2 } from 'lucide-react';

interface PdfPreviewDialogProps {
    open: boolean;
    onClose: () => void;
    pdfUrl: string | null;
    onDownload: () => void;
    loading?: boolean;
    title?: string;
}

export function PdfPreviewDialog({
    open,
    onClose,
    pdfUrl,
    onDownload,
    loading = false,
    title = "Pré-visualização do PDF"
}: PdfPreviewDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 min-h-[60vh] bg-gray-100">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                            <span className="ml-2 text-gray-600">Gerando pré-visualização...</span>
                        </div>
                    ) : pdfUrl ? (
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full min-h-[60vh] border-0"
                            title="PDF Preview"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Não foi possível carregar a pré-visualização
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t gap-2 sm:justify-between">
                    <Button variant="outline" onClick={onClose}>
                        <X className="w-4 h-4 mr-2" />
                        Fechar
                    </Button>
                    <Button
                        onClick={onDownload}
                        disabled={!pdfUrl || loading}
                        className="bg-teal-600 hover:bg-teal-700"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
