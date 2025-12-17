import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    containerClassName?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({
    src,
    alt,
    className,
    containerClassName = "",
    ...props
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    return (
        <div className={`relative ${containerClassName} overflow-hidden`}>
            {/* Skeleton / Loading State */}
            {isLoading && (
                <div className="absolute inset-0 bg-gray-900 animate-pulse flex items-center justify-center z-10">
                    <ImageIcon className="text-gray-800 animate-bounce" size={24} />
                </div>
            )}

            {/* Actual Image */}
            <img
                src={src}
                alt={alt}
                className={`transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'} ${className}`}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                    setIsLoading(false);
                    setError(true);
                }}
                loading="lazy"
                {...props}
            />

            {/* Error State Fallback */}
            {error && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-500 text-xs">
                    <span>Failed to load</span>
                </div>
            )}
        </div>
    );
};

export default LazyImage;
