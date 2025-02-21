import React from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, Loader2, AlertCircle } from 'lucide-react';
import { Order } from '@/types';
import { Button } from './ui/Button';
import { LoadingModal } from './ui/LoadingModal';
import { analyzePDFContent } from '@/lib/gemini';
import { cn } from '@/lib/utils';

interface PDFAnalyzerProps {
  onOrdersAnalyzed: (orders: Order[]) => void;
  productData: any[];
}

export const PDFAnalyzer: React.FC<PDFAnalyzerProps> = ({
  onOrdersAnalyzed,
  productData
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
    setProgress({ analyzing: true, current: 0, total: files.length });
    const analyzedOrders: Order[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(prev => ({ 
          analyzing: true,
          current: i + 1, 
          total: prev?.total || files.length 
        }));

        // Read file as base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Analyze PDF using Gemini
        try {
          const order = await analyzePDFContent(base64, productData);
          if (order) {
            // Log the extracted order for debugging
            console.log('Extracted order with manifest:', {
              destination: order.destination,
              time: order.time,
              manifestNumber: order.manifestNumber,
              productCount: order.products.length
            });
            
            if (order.manifestNumber) {
              console.log('Found manifest number:', order.manifestNumber);
            }
            analyzedOrders.push(order);
          } else {
            throw new Error(`Failed to analyze PDF: ${file.name}`);
          }
        } catch (err) {
          console.error(`Error analyzing PDF ${file.name}:`, err);
          setError(`Failed to analyze PDF: ${file.name}. Please check the file and try again.`);
          break;
        }
      }

      if (analyzedOrders.length > 0) {
        // Log orders before submitting
        console.log('Submitting orders with manifests:', 
          analyzedOrders.map(o => ({
            destination: o.destination,
            manifestNumber: o.manifestNumber
          }))
        );
        
        await onOrdersAnalyzed(analyzedOrders);
        setFiles([]);
      }
    } catch (err) {
      console.error('Error analyzing PDFs:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze PDFs. Please try again.');
    } finally {
      setAnalyzing(false);
      setProgress(prev => prev ? { ...prev, analyzing: false } : null);
      setProgress(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
      <LoadingModal 
        isOpen={analyzing || Boolean(progress?.analyzing)} 
        message={progress ? `Analyzing PDF ${progress.current} of ${progress.total}...` : 'Analyzing PDFs...'}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-xl font-semibold">Upload Order PDFs</h2>
        {progress && <p className="text-sm text-gray-600">Processing {progress.current} of {progress.total} PDFs...</p>}
      </div>

      <div 
        {...getRootProps()} 
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive ? "border-black bg-gray-50" : "border-gray-300 hover:border-gray-400"
        )}
      >
        <input {...getInputProps()} />
        <FileUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600 mb-2">
          {isDragActive ? (
            "Drop the PDF files here"
          ) : (
            "Drag and drop PDF files here, or click to select files"
          )}
        </p>
        <p className="text-sm text-gray-500">
          You can upload multiple PDFs at once
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Selected Files ({files.length})</h3>
            <Button
              onClick={analyzePDFs}
              disabled={progress?.analyzing}
              className="flex items-center gap-2 min-w-[120px] justify-center"
            >
              {progress?.analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4" />
                  <span>Analyze PDFs</span>
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            {files.map((file, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <span className="truncate flex-1 mr-4">{file.name}</span>
                <Button
                  variant="outline"
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
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};