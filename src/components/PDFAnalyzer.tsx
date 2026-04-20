import React from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, Loader2, AlertCircle } from 'lucide-react';
import { Destination, Order } from '@/types';
import { Button } from './ui/Button';
import { LoadingModal } from './ui/LoadingModal';
import { analyzePDFContent } from '@/lib/gemini';
import { cn } from '@/lib/utils';

interface PDFAnalyzerProps {
  onOrdersAnalyzed: (orders: Order[]) => void;
  productData: any[];
  destinations: Destination[];
}

export const PDFAnalyzer: React.FC<PDFAnalyzerProps> = ({
  onOrdersAnalyzed,
  productData,
  destinations
}) => {
  const [files, setFiles] = React.useState<File[]>([]);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<{
    analyzing: boolean;
    current: number;
    total: number;
  } | null>(null);

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  const analyzePDFs = async () => {
    if (files.length === 0) return;

    setAnalyzing(true);
    setError(null);
    setProgress({ analyzing: true, current: 0, total: files.length });

    const CONCURRENCY = 4;
    const destinationNames = destinations.map(d => d.name);
    const results: Array<Order | null> = new Array(files.length).fill(null);
    const failedIndices = new Set<number>();
    let completed = 0;

    const fileToBase64 = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    const queue = files.map((file, index) => ({ file, index }));

    const worker = async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        const { file, index } = next;

        try {
          const base64 = await fileToBase64(file);
          const order = await analyzePDFContent(base64, productData, destinationNames);

          if (order) {
            console.log('Extracted order with manifest:', {
              destination: order.destination,
              time: order.time,
              manifestNumber: order.manifestNumber,
              transportCompany: order.transportCompany,
              trailerType: order.trailerType,
              trailerSize: order.trailerSize,
              productCount: order.products.length
            });

            if (order.time && order.time !== "00:00") {
              console.log('Successfully extracted time from PDF:', order.time);
            }
            if (order.manifestNumber) {
              console.log('Found manifest number:', order.manifestNumber);
            }
            if (order.transportCompany) {
              console.log('Found transport company:', order.transportCompany);
            }

            results[index] = order;
          } else {
            console.error(`Failed to analyze PDF ${file.name}: no order returned`);
            failedIndices.add(index);
          }
        } catch (err) {
          console.error(`Error analyzing PDF ${file.name}:`, err);
          failedIndices.add(index);
        } finally {
          completed += 1;
          setProgress(prev => prev ? { ...prev, current: completed } : prev);
        }
      }
    };

    try {
      const workerCount = Math.min(CONCURRENCY, files.length);
      await Promise.all(Array.from({ length: workerCount }, () => worker()));

      const analyzedOrders = results.filter((o): o is Order => o !== null);

      if (analyzedOrders.length > 0) {
        console.log('Submitting orders with manifests, transport companies, and trailer info:',
          analyzedOrders.map(o => ({
            destination: o.destination,
            manifestNumber: o.manifestNumber,
            transportCompany: o.transportCompany,
            trailerInfo: o.trailerType || o.trailerSize
              ? `${o.trailerType || ''} ${o.trailerSize || ''}`.trim()
              : 'None'
          }))
        );

        await onOrdersAnalyzed(analyzedOrders);
      }

      if (failedIndices.size > 0) {
        const failedNames = files
          .filter((_, i) => failedIndices.has(i))
          .map(f => f.name);
        const plural = failedIndices.size === 1 ? '' : 's';
        if (analyzedOrders.length > 0) {
          setError(
            `Failed to analyze ${failedIndices.size} of ${files.length} PDF${plural}: ${failedNames.join(', ')}. The successful ones were added.`
          );
        } else {
          setError(
            `Failed to analyze PDF${plural}: ${failedNames.join(', ')}. Please check the file${plural} and try again.`
          );
        }
        setFiles(prev => prev.filter((_, i) => failedIndices.has(i)));
      } else {
        setFiles([]);
      }
    } catch (err) {
      console.error('Error analyzing PDFs:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze PDFs. Please try again.');
    } finally {
      setAnalyzing(false);
      setProgress(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white p-6 sm:p-7 rounded-card border border-neutral-200/70 shadow-card mb-6">
      <LoadingModal
        isOpen={analyzing || Boolean(progress?.analyzing)}
        message={progress ? `Analyzing PDF ${progress.current} of ${progress.total}...` : 'Analyzing PDFs...'}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-neutral-100 text-neutral-600">
            <FileUp className="w-4 h-4" />
          </div>
          <h2 className="text-base font-semibold tracking-tight text-neutral-900">
            Import from PDF
          </h2>
        </div>
        {progress && (
          <p className="text-xs text-neutral-500">
            Processing {progress.current} of {progress.total}…
          </p>
        )}
      </div>

      <div
        {...getRootProps()}
        className={cn(
          'border border-dashed rounded-card p-10 text-center cursor-pointer transition-all duration-200 ease-out-soft',
          isDragActive
            ? 'border-brand-400 bg-brand-50/50 ring-4 ring-brand-100/60'
            : 'border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50/60'
        )}
      >
        <input {...getInputProps()} />
        <div className={cn(
          'w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center transition-colors',
          isDragActive ? 'bg-brand-100 text-brand-600' : 'bg-neutral-100 text-neutral-500'
        )}>
          <FileUp className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-neutral-800 mb-1">
          {isDragActive ? 'Drop PDFs to analyze' : 'Drag and drop PDF files here'}
        </p>
        <p className="text-xs text-neutral-500">
          or click to select — multiple files supported
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-700">
              Selected files <span className="text-neutral-400">({files.length})</span>
            </h3>
            <Button
              onClick={analyzePDFs}
              disabled={progress?.analyzing}
              size="sm"
              className="flex items-center gap-1.5 min-w-[120px] justify-center"
            >
              {progress?.analyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing…</span>
                </>
              ) : (
                <>
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Analyze PDFs</span>
                </>
              )}
            </Button>
          </div>

          <div className="space-y-1.5">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-3 py-2 bg-neutral-50 border border-neutral-200/70 rounded-lg"
              >
                <span className="truncate flex-1 mr-4 text-sm text-neutral-700">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="shrink-0"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 px-3.5 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};