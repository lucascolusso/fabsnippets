import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ImageOff, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface SnippetImageProps {
  src: string;
  onError: () => void;
  className?: string;
}

/**
 * SnippetImage component handles displaying images with proper loading states,
 * error handling, and retry functionality.
 */
export default function SnippetImage({ src, onError, className = "" }: SnippetImageProps) {
  const [loading, setLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState(src);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryLoading, setRetryLoading] = useState(false);
  
  // Generate a cache-busting URL for the image
  const getCacheBustedUrl = (url: string) => {
    return `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
  };
  
  // Check if the image exists and set up the URL
  useEffect(() => {
    if (!src) {
      setError(true);
      setLoading(false);
      return;
    }
    
    // Reset states when src changes
    setLoading(true);
    setError(false);
    
    // Create a new image object to preload and test the image
    const img = new Image();
    
    img.onload = () => {
      // Only add cache-busting if it's an upload URL
      if (src.startsWith('/uploads/')) {
        setImageSrc(getCacheBustedUrl(src));
      } else {
        setImageSrc(src);
      }
      setError(false);
    };
    
    img.onerror = () => {
      console.error(`Failed to load image: ${src}`);
      setError(true);
      setLoading(false);
      onError();
    };
    
    // Start loading the image
    img.src = src;
    
    // Clean up
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, retryCount, onError]);

  // Handle successful image load
  const handleLoad = () => {
    setLoading(false);
    setError(false);
    setRetryLoading(false);
  };

  // Handle image load error
  const handleError = () => {
    setLoading(false);
    setError(true);
    setRetryLoading(false);
    onError();
  };

  // Retry loading the image
  const handleRetry = () => {
    setRetryLoading(true);
    setRetryCount(prev => prev + 1);
  };

  // If there's an error, show a message with retry button
  if (error) {
    return (
      <div className={`w-full rounded-lg border border-destructive bg-destructive/10 p-4 ${className}`}>
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <ImageOff className="h-12 w-12 text-destructive" />
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The image for this snippet could not be loaded. It may have been deleted or moved.
            </AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            onClick={handleRetry}
            disabled={retryLoading}
            className="mt-2"
          >
            {retryLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Loading Image
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <Skeleton className="w-full h-[300px] rounded-lg absolute top-0 left-0" />
      )}
      <img 
        src={imageSrc} 
        alt="Snippet visualization" 
        className="w-full rounded-lg shadow-lg object-contain max-h-[60vh]"
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
      />
    </div>
  );
}
