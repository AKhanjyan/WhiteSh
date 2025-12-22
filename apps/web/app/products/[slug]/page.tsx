'use client';

import { useState, useEffect, use, useCallback, useMemo } from 'react';
import type { MouseEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { formatPrice, getStoredCurrency } from '../../../lib/currency';
import { getStoredLanguage } from '../../../lib/language';
import { useAuth } from '../../../lib/auth/AuthContext';
import { RelatedProducts } from '../../../components/RelatedProducts';
import { ProductReviews } from '../../../components/ProductReviews';
import { Heart, Minus, Plus, Maximize2 } from 'lucide-react';
import { CompareIcon } from '../../../components/icons/CompareIcon';
import { ProductLabels } from '../../../components/ProductLabels';

interface ProductPageProps {
  params: Promise<{ slug?: string }>;
}

interface ProductMedia {
  url?: string;
  type?: string;
}

interface VariantOption {
  attribute: string;
  value: string;
  key: string;
}

interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  originalPrice?: number | null;
  compareAtPrice?: number;
  stock: number;
  available: boolean;
  options: VariantOption[];
  productDiscount?: number | null;
  globalDiscount?: number | null;
  imageUrl?: string;
}

interface ProductLabel {
  id: string;
  type: 'text' | 'percentage';
  value: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  color: string | null;
}

interface Product {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  media: ProductMedia[] | string[];
  variants: ProductVariant[];
  labels?: ProductLabel[];
  brand?: {
    id: string;
    name: string;
  };
  categories?: Array<{
    id: string;
    slug: string;
    title: string;
  }>;
  productDiscount?: number | null;
  globalDiscount?: number | null;
}


// Reserved routes that should not be treated as product slugs
const RESERVED_ROUTES = ['admin', 'login', 'register', 'cart', 'checkout', 'profile', 'orders', 'wishlist', 'compare', 'categories', 'products', 'about', 'contact', 'delivery', 'shipping', 'returns', 'faq', 'support', 'stores', 'privacy', 'terms', 'cookies'];

const WISHLIST_KEY = 'shop_wishlist';
const COMPARE_KEY = 'shop_compare';

export default function ProductPage({ params }: ProductPageProps) {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currency, setCurrency] = useState(getStoredCurrency());
  // Language state - used in handleLanguageUpdate function (setLanguage)
  // eslint-disable-next-line no-unused-vars
  const [language, setLanguage] = useState(getStoredLanguage());
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showMessage, setShowMessage] = useState<string | null>(null);
  const [thumbnailStartIndex, setThumbnailStartIndex] = useState(0);
  const [showZoom, setShowZoom] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isInCompare, setIsInCompare] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Array<{ rating: number }>>([]);
  const thumbnailsPerView = 3;

  // Unified image processing helper - DEFINED FIRST
  const processImageUrl = useCallback((url: any): string | null => {
    if (!url) return null;
    
    let finalUrl = '';
    if (typeof url === 'string') {
      finalUrl = url.trim();
    } else if (typeof url === 'object') {
      finalUrl = (url.url || url.src || '').trim();
    }
    
    if (!finalUrl) return null;
    
    if (finalUrl.startsWith('http') || finalUrl.startsWith('data:')) {
      return finalUrl;
    }
    
    if (finalUrl.startsWith('/')) {
      return finalUrl;
    }
    
    return `/${finalUrl}`;
  }, []);

  /**
   * Smart split for comma-separated image URLs that handles Base64 data URIs
   */
  const smartSplitUrls = useCallback((str: string | null | undefined): string[] => {
    if (!str) return [];
    if (!str.includes('data:')) {
      return str.split(',').map(s => s.trim()).filter(Boolean);
    }
    
    const parts = str.split(',');
    const results: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (part.startsWith('data:')) {
        if (i + 1 < parts.length) {
          results.push(part + ',' + parts[i + 1].trim());
          i++;
        } else {
          results.push(part);
        }
      } else if (part) {
        results.push(part);
      }
    }
    return results;
  }, []);

  // Get images array from product - DEFINED SECOND
  const images = useMemo(() => {
    if (!product) return [];
    
    const allRawImages: any[] = [];
    // 1. Add general product media first
    if (product.media) allRawImages.push(...product.media);
    
    // 2. Add all variant images
    if (product.variants) {
      product.variants.forEach(v => {
        if (v.imageUrl) {
          const split = smartSplitUrls(v.imageUrl);
          allRawImages.push(...split);
        }
      });
    }

    const processedImages = allRawImages
      .map(processImageUrl)
      .filter((url): url is string => url !== null);
    
    // Return all unique images (no filtering by color anymore)
    return Array.from(new Set(processedImages));
  }, [product, processImageUrl, smartSplitUrls]);

  // Helper function to get color hex/rgb from color name
  const getColorValue = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      'beige': '#F5F5DC', 'black': '#000000', 'blue': '#0000FF', 'brown': '#A52A2A',
      'gray': '#808080', 'grey': '#808080', 'green': '#008000', 'red': '#FF0000',
      'white': '#FFFFFF', 'yellow': '#FFFF00', 'orange': '#FFA500', 'pink': '#FFC0CB',
      'purple': '#800080', 'navy': '#000080', 'maroon': '#800000', 'olive': '#808000',
      'teal': '#008080', 'cyan': '#00FFFF', 'magenta': '#FF00FF', 'lime': '#00FF00',
      'silver': '#C0C0C0', 'gold': '#FFD700',
    };
    const normalizedName = colorName.toLowerCase().trim();
    return colorMap[normalizedName] || '#CCCCCC';
  };
  
  const resolvedParams = use(params);
  const rawSlug = resolvedParams?.slug ?? '';
  const slugParts = rawSlug.includes(':') ? rawSlug.split(':') : [rawSlug];
  const slug = slugParts[0];
  const variantIdFromUrl = slugParts.length > 1 ? slugParts[1] : null;

  useEffect(() => {
    if (!slug) return;
    if (RESERVED_ROUTES.includes(slug.toLowerCase())) {
      router.replace(`/${slug}`);
    }
  }, [slug, router]);

  // Fetch product function - defined outside useEffect to be accessible
  const fetchProduct = useCallback(async () => {
    if (!slug || RESERVED_ROUTES.includes(slug.toLowerCase())) return;
    
    try {
      setLoading(true);
      const currentLang = getStoredLanguage();
      const data = await apiClient.get<Product>(`/api/v1/products/${slug}`, {
        params: { lang: currentLang }
      });
      setProduct(data);
      setCurrentImageIndex(0);
      setThumbnailStartIndex(0);
      
      if (data.variants && data.variants.length > 0) {
        let initialVariant = data.variants[0];
        if (variantIdFromUrl) {
          const variantById = data.variants.find(v => v.id === variantIdFromUrl || v.id.endsWith(variantIdFromUrl));
          const variantByIndex = data.variants[parseInt(variantIdFromUrl) - 1];
          initialVariant = variantById || variantByIndex || data.variants[0];
        }
        setSelectedVariant(initialVariant);
        const colorOption = initialVariant.options?.find(opt => opt.key === 'color');
        if (colorOption) setSelectedColor(colorOption.value);
        const sizeOption = initialVariant.options?.find(opt => opt.key === 'size');
        if (sizeOption) setSelectedSize(sizeOption.value);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  }, [slug, variantIdFromUrl]);

  useEffect(() => {
    if (!slug || RESERVED_ROUTES.includes(slug.toLowerCase())) return;

    fetchProduct();

    const handleCurrencyUpdate = () => setCurrency(getStoredCurrency());
    const handleLanguageUpdate = () => {
      setLanguage(getStoredLanguage());
      // Refetch product when language changes to update labels
      fetchProduct();
    };
    window.addEventListener('currency-updated', handleCurrencyUpdate);
    window.addEventListener('language-updated', handleLanguageUpdate);
    return () => {
      window.removeEventListener('currency-updated', handleCurrencyUpdate);
      window.removeEventListener('language-updated', handleLanguageUpdate);
    };
  }, [slug, variantIdFromUrl, router, fetchProduct]);

  useEffect(() => {
    if (!product) return;
    const checkWishlist = () => {
      if (typeof window === 'undefined') return;
      try {
        const stored = localStorage.getItem(WISHLIST_KEY);
        const wishlist = stored ? JSON.parse(stored) : [];
        setIsInWishlist(wishlist.includes(product.id));
      } catch { setIsInWishlist(false); }
    };
    checkWishlist();
    window.addEventListener('wishlist-updated', checkWishlist);
    return () => window.removeEventListener('wishlist-updated', checkWishlist);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    const checkCompare = () => {
      if (typeof window === 'undefined') return;
      try {
        const stored = localStorage.getItem(COMPARE_KEY);
        const compare = stored ? JSON.parse(stored) : [];
        setIsInCompare(compare.includes(product.id));
      } catch { setIsInCompare(false); }
    };
    checkCompare();
    window.addEventListener('compare-updated', checkCompare);
    return () => window.removeEventListener('compare-updated', checkCompare);
  }, [product?.id]);

  // Ensure currentImageIndex is valid
  useEffect(() => {
    if (images.length > 0 && currentImageIndex >= images.length) {
      setCurrentImageIndex(0);
    }
  }, [images.length, currentImageIndex]);

  useEffect(() => {
    if (!product) return;
    const loadReviews = () => {
      if (typeof window === 'undefined') return;
      try {
        const stored = localStorage.getItem(`reviews_${product.id}`);
        if (stored) setReviews(JSON.parse(stored));
      } catch (error) { console.error('Error loading reviews:', error); }
    };
    loadReviews();
    window.addEventListener('review-updated', loadReviews);
    return () => window.removeEventListener('review-updated', loadReviews);
  }, [product?.id]);

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const findVariantByColorAndSize = useCallback((color: string | null, size: string | null): ProductVariant | null => {
    if (!product?.variants || product.variants.length === 0) return null;
    
    const normalizedColor = color?.toLowerCase().trim();
    const normalizedSize = size?.toLowerCase().trim();

    // 1. Try exact match (Case-insensitive)
    if (normalizedColor && normalizedSize) {
      const variant = product.variants.find(v => {
        const vColor = v.options?.find(opt => opt.key === 'color')?.value.toLowerCase().trim();
        const vSize = v.options?.find(opt => opt.key === 'size')?.value.toLowerCase().trim();
        return vColor === normalizedColor && vSize === normalizedSize;
      });
      if (variant) return variant;
    }

    // 2. If color selected but no exact match with size, find any variant of this color
    if (normalizedColor) {
      // Prefer in-stock variant of this color
      const colorVariants = product.variants.filter(v => 
        v.options?.find(opt => opt.key === 'color')?.value.toLowerCase().trim() === normalizedColor
      );
      
      if (colorVariants.length > 0) {
        return colorVariants.find(v => v.stock > 0) || colorVariants[0];
      }
    }

    // 3. If only size selected or fallback for size
    if (normalizedSize) {
      const sizeVariants = product.variants.filter(v => 
        v.options?.find(opt => opt.key === 'size')?.value.toLowerCase().trim() === normalizedSize
      );
      
      if (sizeVariants.length > 0) {
        return sizeVariants.find(v => v.stock > 0) || sizeVariants[0];
      }
    }

    // 4. Ultimate fallback
    return product.variants.find(v => v.stock > 0) || product.variants[0] || null;
  }, [product?.variants]);

  useEffect(() => {
    if (product && product.variants && product.variants.length > 0) {
      const newVariant = findVariantByColorAndSize(selectedColor, selectedSize);
      
      if (newVariant && newVariant.id !== selectedVariant?.id) {
        setSelectedVariant(newVariant);
        
        // Synchronize selection states with the found variant
        const colorOpt = newVariant.options?.find(o => o.key === 'color');
        const sizeOpt = newVariant.options?.find(o => o.key === 'size');
        
        if (colorOpt && colorOpt.value !== selectedColor) {
          setSelectedColor(colorOpt.value);
        }
        if (sizeOpt && sizeOpt.value !== selectedSize) {
          setSelectedSize(sizeOpt.value);
        }
      }
    }
  }, [selectedColor, selectedSize, findVariantByColorAndSize, selectedVariant?.id, product]);

  const colorGroups: Array<{ color: string; stock: number; variants: ProductVariant[] }> = [];
  if (product?.variants) {
    const colorMap = new Map<string, ProductVariant[]>();
    product.variants.forEach(variant => {
      const color = variant.options?.find(opt => opt.key === 'color')?.value || 'default';
      if (!colorMap.has(color)) colorMap.set(color, []);
      colorMap.get(color)!.push(variant);
    });
    colorMap.forEach((variants, color) => {
      const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
      colorGroups.push({ color, stock: totalStock, variants });
    });
  }

  const sizeGroups: Array<{ size: string; stock: number; variants: ProductVariant[] }> = [];
  if (product?.variants) {
    const sizeMap = new Map<string, ProductVariant[]>();
    product.variants.forEach(variant => {
      const size = variant.options?.find(opt => opt.key === 'size')?.value || 'default';
      if (!sizeMap.has(size)) sizeMap.set(size, []);
      sizeMap.get(size)!.push(variant);
    });
    sizeMap.forEach((variants, size) => {
      const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
      sizeGroups.push({ size, stock: totalStock, variants });
    });
  }

  const currentVariant = selectedVariant || findVariantByColorAndSize(selectedColor, selectedSize) || product?.variants?.[0] || null;
  const price = currentVariant?.price || 0;
  const originalPrice = currentVariant?.originalPrice;
  const compareAtPrice = currentVariant?.compareAtPrice;
  const discountPercent = currentVariant?.productDiscount || product?.productDiscount || null;
  const maxQuantity = currentVariant?.stock && currentVariant.stock > 0 ? currentVariant.stock : 0;
  const isOutOfStock = !currentVariant || currentVariant.stock <= 0;
  const isVariationRequired = (colorGroups.filter(g => g.stock > 0).length > 0 && !selectedColor) || 
                               (sizeGroups.filter(g => g.stock > 0).length > 0 && !selectedSize);
  const canAddToCart = !isOutOfStock && !isVariationRequired;

  useEffect(() => {
    if (!currentVariant || currentVariant.stock <= 0) { setQuantity(0); return; }
    setQuantity(prev => {
      const currentStock = currentVariant.stock;
      if (prev > currentStock) return currentStock;
      if (prev <= 0 && currentStock > 0) return 1;
      return prev;
    });
  }, [currentVariant?.id, currentVariant?.stock]);

  const adjustQuantity = (delta: number) => {
    if (isOutOfStock || isVariationRequired) return;
    setQuantity(prev => {
      const next = prev + delta;
      if (next < 1) return currentVariant && currentVariant.stock > 0 ? 1 : 0;
      return next > maxQuantity ? maxQuantity : next;
    });
  };

  useEffect(() => {
    if (images.length > thumbnailsPerView) {
      if (currentImageIndex < thumbnailStartIndex) setThumbnailStartIndex(currentImageIndex);
      else if (currentImageIndex >= thumbnailStartIndex + thumbnailsPerView) setThumbnailStartIndex(currentImageIndex - thumbnailsPerView + 1);
    }
  }, [currentImageIndex, images.length, thumbnailStartIndex]);

  const handleColorSelect = (color: string) => {
    if (selectedColor === color) {
      setSelectedColor(null);
    } else {
      setSelectedColor(color);
      
      // Find the first image associated with this color and jump to it
      if (product?.variants) {
        const variantWithImage = product.variants.find(v => 
          v.options?.some(opt => opt.key === 'color' && opt.value === color) && 
          v.imageUrl
        );
        
        if (variantWithImage && variantWithImage.imageUrl) {
          const firstColorImageUrl = smartSplitUrls(variantWithImage.imageUrl)[0];
          const processedUrl = processImageUrl(firstColorImageUrl);
          
          if (processedUrl) {
            const imageIndex = images.indexOf(processedUrl);
            if (imageIndex !== -1) {
              setCurrentImageIndex(imageIndex);
              
              // Also update thumbnail scroll if needed
              if (imageIndex < thumbnailStartIndex || imageIndex >= thumbnailStartIndex + thumbnailsPerView) {
                const newStart = Math.max(0, Math.min(images.length - thumbnailsPerView, imageIndex));
                setThumbnailStartIndex(newStart);
              }
            }
          }
        }
      }
    }
  };

  const handleSizeSelect = (size: string) => {
    if (selectedSize === size) setSelectedSize(null);
    else setSelectedSize(size);
  };

  const handleAddToWishlist = (e: MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!product || typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(WISHLIST_KEY);
      const wishlist: string[] = stored ? JSON.parse(stored) : [];
      if (isInWishlist) {
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist.filter(id => id !== product.id)));
        setIsInWishlist(false);
        setShowMessage('Removed from wishlist');
      } else {
        wishlist.push(product.id);
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
        setIsInWishlist(true);
        setShowMessage('Added to wishlist');
      }
      setTimeout(() => setShowMessage(null), 2000);
      window.dispatchEvent(new Event('wishlist-updated'));
    } catch (err) { console.error(err); }
  };

  const handleCompareToggle = (e: MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!product || typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(COMPARE_KEY);
      const compare: string[] = stored ? JSON.parse(stored) : [];
      if (isInCompare) {
        localStorage.setItem(COMPARE_KEY, JSON.stringify(compare.filter(id => id !== product.id)));
        setIsInCompare(false);
        setShowMessage('Removed from compare');
      } else {
        if (compare.length >= 4) { setShowMessage('Compare list is full'); }
        else {
          compare.push(product.id);
          localStorage.setItem(COMPARE_KEY, JSON.stringify(compare));
          setIsInCompare(true);
          setShowMessage('Added to compare');
        }
      }
      setTimeout(() => setShowMessage(null), 2000);
      window.dispatchEvent(new Event('compare-updated'));
    } catch (err) { console.error(err); }
  };

  if (loading || !product) return <div className="max-w-7xl mx-auto px-4 py-16 text-center">Loading...</div>;

  const visibleThumbnails = images.slice(thumbnailStartIndex, thumbnailStartIndex + thumbnailsPerView);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 items-start">
        <div className="flex gap-6 items-start">
          {/* Left Column - Thumbnails (Vertical) */}
          <div className="flex flex-col gap-4 w-28 flex-shrink-0">
            <div className="flex flex-col gap-4 flex-1">
              {visibleThumbnails.map((image, index) => {
                const actualIndex = thumbnailStartIndex + index;
                const isActive = actualIndex === currentImageIndex;
                return (
                  <button 
                    key={actualIndex} 
                    onClick={() => setCurrentImageIndex(actualIndex)}
                    className={`relative w-full aspect-[3/4] rounded-lg overflow-hidden border bg-white transition-all duration-300 ${
                      isActive 
                        ? 'border-gray-400 shadow-[0_2px_8px_rgba(0,0,0,0.12)] ring-2 ring-gray-300' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)]'
                    }`}
                  >
                    <img 
                      src={image} 
                      alt="" 
                      className="w-full h-full object-cover transition-transform duration-300" 
                    />
                  </button>
                );
              })}
            </div>
            
            {/* Navigation Arrows - Both at the bottom, side by side */}
            {images.length > thumbnailsPerView && (
              <div className="flex flex-row gap-1.5 justify-center">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const newIndex = Math.max(0, currentImageIndex - 1);
                    setCurrentImageIndex(newIndex);
                    // Update thumbnail scroll to show the new image
                    if (newIndex < thumbnailStartIndex) {
                      setThumbnailStartIndex(newIndex);
                    }
                  }}
                  disabled={currentImageIndex <= 0}
                  className="w-9 h-9 rounded border transition-all duration-200 flex items-center justify-center border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-200 hover:shadow-[0_1px_3px_rgba(0,0,0,0.1)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:border-gray-300 disabled:hover:shadow-none bg-gray-100"
                  aria-label="Previous thumbnail"
                >
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2.5} 
                      d="M5 15l7-7 7 7" 
                    />
                  </svg>
                </button>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const newIndex = Math.min(images.length - 1, currentImageIndex + 1);
                    setCurrentImageIndex(newIndex);
                    // Update thumbnail scroll to show the new image
                    if (newIndex >= thumbnailStartIndex + thumbnailsPerView) {
                      setThumbnailStartIndex(newIndex - thumbnailsPerView + 1);
                    }
                  }}
                  disabled={currentImageIndex >= images.length - 1}
                  className="w-9 h-9 rounded border transition-all duration-200 flex items-center justify-center border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-200 hover:shadow-[0_1px_3px_rgba(0,0,0,0.1)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:border-gray-300 disabled:hover:shadow-none bg-gray-100"
                  aria-label="Next thumbnail"
                >
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2.5} 
                      d="M19 9l-7 7-7-7" 
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {/* Right Column - Main Image */}
          <div className="flex-1">
            <div className="relative aspect-square bg-white rounded-lg overflow-hidden group shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            {images.length > 0 ? (
              <img 
                src={images[currentImageIndex]} 
                alt={product.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
            )}
            
            {/* Discount Badge on Image - Blue circle in top-right */}
            {discountPercent && (
              <div className="absolute top-4 right-4 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold z-10 shadow-[0_2px_8px_rgba(37,99,235,0.3)]">
                -{discountPercent}%
              </div>
            )}

            {product.labels && <ProductLabels labels={product.labels} />}
            
            {/* Control Buttons - Bottom left */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-3 z-10">
              {/* Fullscreen Button */}
              <button 
                onClick={() => setShowZoom(true)} 
                className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/50 shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:bg-white/90 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
                aria-label="Fullscreen image"
              >
                <Maximize2 className="w-5 h-5 text-gray-800" />
              </button>
            </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col h-full">
          <div className="flex-1">
            {product.brand && <p className="text-sm text-gray-500 mb-2">{product.brand.name}</p>}
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{product.title}</h1>
            <div className="mb-6">
              <div className="flex flex-col gap-1">
                <p className="text-3xl font-bold text-gray-900">{formatPrice(price, currency)}</p>
                {(originalPrice || (compareAtPrice && compareAtPrice > price)) && (
                  <p className="text-xl text-gray-500 line-through decoration-gray-400">
                    {formatPrice(originalPrice || compareAtPrice || 0, currency)}
                  </p>
                )}
              </div>
            </div>
            <div className="text-gray-600 mb-8 prose prose-sm" dangerouslySetInnerHTML={{ __html: product.description || '' }} />

            <div className="mt-8 p-6 bg-white border border-gray-200 rounded-2xl space-y-5">
            {/* Rating Section */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(averageRating)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
                </span>
              </div>
              <span className="text-sm text-gray-600">
                ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
              </span>
            </div>

            {colorGroups.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Color:</label>
                <div className="flex flex-wrap gap-2">
                  {colorGroups.map((g) => {
                    const isSelected = selectedColor === g.color;
                    const isDisabled = g.stock <= 0;
                    
                    return (
                      <button 
                        key={g.color} 
                        onClick={() => !isDisabled && handleColorSelect(g.color)}
                        disabled={isDisabled}
                        className={`w-10 h-10 rounded-full border-2 transition-all ${
                          isSelected 
                            ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900 scale-110' 
                            : isDisabled 
                              ? 'border-gray-100 opacity-30 grayscale cursor-not-allowed' 
                              : 'border-gray-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: getColorValue(g.color) }} 
                        title={isDisabled ? `${g.color} (Out of Stock)` : g.color} 
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {sizeGroups.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase">Size</label>
                <div className="flex flex-wrap gap-2">
                  {sizeGroups.map((g) => {
                    let displayStock = g.stock;
                    if (selectedColor) {
                      const v = g.variants.find(v => v.options?.some(opt => opt.key === 'color' && opt.value === selectedColor));
                      displayStock = v ? v.stock : 0;
                    }
                    const isSelected = selectedSize === g.size;
                    const isDisabled = displayStock <= 0;

                    return (
                      <button 
                        key={g.size} 
                        onClick={() => !isDisabled && handleSizeSelect(g.size)}
                        disabled={isDisabled}
                        className={`min-w-[50px] px-3 py-2 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? 'border-gray-900 bg-gray-50' 
                            : isDisabled 
                              ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' 
                              : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex flex-col text-center">
                          <span className={`text-sm font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>{g.size}</span>
                          <span className={`text-xs ${isDisabled ? 'text-gray-300' : 'text-gray-500'}`}>{displayStock} pcs</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            </div>
          </div>
          
          {/* Action Buttons - Aligned with bottom of image */}
          <div className="mt-auto pt-6">
            <div className="flex items-center gap-3 pt-4 border-t">
              <div className="flex items-center border rounded-xl overflow-hidden bg-gray-50">
                <button onClick={() => adjustQuantity(-1)} className="w-12 h-12 flex items-center justify-center">-</button>
                <div className="w-12 text-center font-bold">{quantity}</div>
                <button onClick={() => adjustQuantity(1)} className="w-12 h-12 flex items-center justify-center">+</button>
              </div>
              <button disabled={!canAddToCart || isAddingToCart} className="flex-1 h-12 bg-gray-900 text-white rounded-xl uppercase font-bold disabled:bg-gray-300"
                onClick={async () => {
                  if (!canAddToCart || !product || !currentVariant) return;
                  setIsAddingToCart(true);
                  try {
                    if (!isLoggedIn) {
                      const stored = localStorage.getItem('shop_cart_guest');
                      const cart = stored ? JSON.parse(stored) : [];
                      const existing = cart.find((i: any) => i.variantId === currentVariant.id);
                      if (existing) existing.quantity += quantity;
                      else cart.push({ productId: product.id, productSlug: product.slug, variantId: currentVariant.id, quantity });
                      localStorage.setItem('shop_cart_guest', JSON.stringify(cart));
                    } else {
                      await apiClient.post('/api/v1/cart/items', { productId: product.id, variantId: currentVariant.id, quantity });
                    }
                    setShowMessage(`Added ${quantity} pcs to cart`);
                    window.dispatchEvent(new Event('cart-updated'));
                  } catch (err) { setShowMessage('Error adding to cart'); }
                  finally { setIsAddingToCart(false); setTimeout(() => setShowMessage(null), 2000); }
                }}>
                {isAddingToCart ? 'Adding...' : (isOutOfStock ? 'Out of Stock' : (isVariationRequired ? 'Select Options' : 'Add to Cart'))}
              </button>
              <button onClick={handleAddToWishlist} className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${isInWishlist ? 'border-gray-900 bg-gray-50' : 'border-gray-200'}`}>
                <Heart fill={isInWishlist ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
          {showMessage && <div className="mt-4 p-4 bg-gray-900 text-white rounded-md shadow-lg">{showMessage}</div>}
        </div>
      </div>
      
      {showZoom && images.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={() => setShowZoom(false)}>
          <img src={images[currentImageIndex]} alt="" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-4 right-4 text-white text-2xl">✕</button>
        </div>
      )}

      <div className="mt-24">
        <ProductReviews productId={product.id} />
      </div>
      <div className="mt-16">
        <RelatedProducts categorySlug={product.categories?.[0]?.slug} currentProductId={product.id} />
      </div>
    </div>
  );
}
