'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../lib/auth/AuthContext';
import { Card, Button, Input } from '@shop/ui';
import { apiClient } from '../../../../lib/api-client';

// Component for adding new color/size
function NewColorSizeInput({ 
  variantId: _variantId, 
  type: _type, 
  onAdd, 
  placeholder 
}: { 
  variantId: string; 
  type: 'color' | 'size'; 
  onAdd: (_name: string) => void; 
  placeholder: string;
}) {
  const [name, setName] = useState('');

  const handleAdd = () => {
    if (name.trim()) {
      onAdd(name.trim());
      setName('');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={handleAdd}
        disabled={!name.trim()}
        className="whitespace-nowrap"
      >
        + Add
      </Button>
    </div>
  );
}

interface Brand {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  title: string;
  slug: string;
  parentId: string | null;
  requiresSizes?: boolean;
}

interface Attribute {
  id: string;
  key: string;
  name: string;
  type: string;
  filterable?: boolean;
  values: Array<{
    id: string;
    value: string;
    label: string;
  }>;
}

interface Variant {
  id: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  sku: string;
  color: string;
  colors: string[]; // Multiple colors support
  colorStocks: Record<string, string>; // Stock for each color: { "red": "10", "blue": "5" }
  colorLabels?: Record<string, string>; // Original labels for manually added colors: { "red": "Красный" }
  size: string;
  sizes: string[]; // Multiple sizes support
  sizeStocks: Record<string, string>; // Stock for each size: { "S": "10", "M": "5" }
  sizeLabels?: Record<string, string>; // Original labels for manually added sizes: { "s": "S" }
  imageUrl: string;
}

interface ProductLabel {
  id?: string;
  type: 'text' | 'percentage';
  value: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  color?: string | null;
}

interface ProductData {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  descriptionHtml?: string;
  brandId?: string | null;
  primaryCategoryId?: string | null;
  categoryIds?: string[];
  published: boolean;
    featured?: boolean;
  media?: string[];
  labels?: ProductLabel[];
  variants?: Array<{
    id?: string;
    price: string;
    compareAtPrice?: string;
    stock: string;
    sku?: string;
    color?: string;
    size?: string;
    imageUrl?: string;
    published?: boolean;
  }>;
}

function AddProductPageContent() {
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('id');
  const isEditMode = !!productId;
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    subtitle: '',
    descriptionHtml: '',
    brandId: '',
    primaryCategoryId: '',
    categoryIds: [] as string[],
    published: false,
    featured: false,
    imageUrls: [] as string[],
    featuredImageIndex: 0,
    variants: [] as Variant[],
    labels: [] as ProductLabel[],
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [newBrandName, setNewBrandName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryRequiresSizes, setNewCategoryRequiresSizes] = useState(false);
  const [useNewBrand, setUseNewBrand] = useState(false);
  const [useNewCategory, setUseNewCategory] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newSizeName, setNewSizeName] = useState('');
  const [addingColor, setAddingColor] = useState(false);
  const [addingSize, setAddingSize] = useState(false);
  const [colorMessage, setColorMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sizeMessage, setSizeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn || !isAdmin) {
        router.push('/admin');
        return;
      }
    }
  }, [isLoggedIn, isAdmin, isLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('📥 [ADMIN] Fetching brands, categories, and attributes...');
        const [brandsRes, categoriesRes, attributesRes] = await Promise.all([
          apiClient.get<{ data: Brand[] }>('/api/v1/admin/brands'),
          apiClient.get<{ data: Category[] }>('/api/v1/admin/categories'),
          apiClient.get<{ data: Attribute[] }>('/api/v1/admin/attributes'),
        ]);
        setBrands(brandsRes.data || []);
        setCategories(categoriesRes.data || []);
        setAttributes(attributesRes.data || []);
        console.log('✅ [ADMIN] Data fetched:', {
          brands: brandsRes.data?.length || 0,
          categories: categoriesRes.data?.length || 0,
          attributes: attributesRes.data?.length || 0,
        });
        // Debug: Log categories with requiresSizes
        if (categoriesRes.data) {
          console.log('📋 [ADMIN] Categories with requiresSizes:', 
            categoriesRes.data.map(cat => ({ 
              id: cat.id, 
              title: cat.title, 
              requiresSizes: cat.requiresSizes 
            }))
          );
        }
      } catch (err: any) {
        console.error('❌ [ADMIN] Error fetching data:', err);
        alert(`Error loading data: ${err.message || 'Unknown error'}`);
      }
    };
    fetchData();
  }, []);

  // Load product data if in edit mode
  useEffect(() => {
    if (productId && isLoggedIn && isAdmin) {
      const loadProduct = async () => {
        try {
          setLoadingProduct(true);
          console.log('📥 [ADMIN] Loading product for edit:', productId);
          const product = await apiClient.get<ProductData>(`/api/v1/admin/products/${productId}`);
          
          // Transform product data to form format
          // Note: colorAttribute and sizeAttribute are available in attributes array if needed
          
          // Merge all variants into a single variant with all colors and sizes
          // This makes editing easier - all colors and sizes in one place
          const allColors = new Set<string>();
          const allSizes = new Set<string>();
          const colorStocksMap = new Map<string, string>();
          const sizeStocksMap = new Map<string, string>();
          let firstPrice = '';
          let firstCompareAtPrice = '';
          let firstSku = '';
          let firstImageUrl = '';
          
          (product.variants || []).forEach((variant: any, index: number) => {
            const color = variant.color || '';
            const size = variant.size || '';
            
            // Convert stock to string, handling 0 correctly
            const stockValue = variant.stock !== undefined && variant.stock !== null 
              ? String(variant.stock) 
              : '';
            
            // Collect all unique colors
            if (color) {
              allColors.add(color);
              // Sum stock for this color if it appears in multiple variants
              const currentStock = colorStocksMap.get(color) || '0';
              const currentStockNum = parseInt(currentStock) || 0;
              const variantStockNum = parseInt(stockValue) || 0;
              colorStocksMap.set(color, String(currentStockNum + variantStockNum));
            }
            
            // Collect all unique sizes
            if (size) {
              allSizes.add(size);
              // Sum stock for this size if it appears in multiple variants
              const currentStock = sizeStocksMap.get(size) || '0';
              const currentStockNum = parseInt(currentStock) || 0;
              const variantStockNum = parseInt(stockValue) || 0;
              sizeStocksMap.set(size, String(currentStockNum + variantStockNum));
            }
            
            // Use first variant's price, compareAtPrice, sku, imageUrl as defaults
            if (index === 0) {
              firstPrice = variant.price !== undefined && variant.price !== null ? String(variant.price) : '';
              firstCompareAtPrice = variant.compareAtPrice !== undefined && variant.compareAtPrice !== null ? String(variant.compareAtPrice) : '';
              firstSku = variant.sku || '';
              firstImageUrl = variant.imageUrl || '';
            }
          });
          
          // Create a single merged variant with all colors and sizes
          const mergedVariant = {
            id: `variant-${Date.now()}-${Math.random()}`,
            price: firstPrice,
            compareAtPrice: firstCompareAtPrice,
            stock: '', // Stock is now per color/size, not per variant
            sku: firstSku,
            color: '', // No single color - we have multiple
            colors: Array.from(allColors),
            colorStocks: Object.fromEntries(colorStocksMap),
            size: '', // No single size - we have multiple
            sizes: Array.from(allSizes),
            sizeStocks: Object.fromEntries(sizeStocksMap),
            imageUrl: firstImageUrl,
          };
          
          const mediaList = product.media || [];
          const normalizedMedia = Array.isArray(mediaList)
            ? mediaList.map((item: any) => (typeof item === 'string' ? item : item?.url || ''))
            : [];
          const featuredIndexFromApi = Array.isArray(mediaList)
            ? mediaList.findIndex((item: any) => typeof item === 'object' && item?.isFeatured)
            : -1;

          setFormData({
            title: product.title || '',
            slug: product.slug || '',
            subtitle: product.subtitle || '',
            descriptionHtml: product.descriptionHtml || '',
            brandId: product.brandId || '',
            primaryCategoryId: product.primaryCategoryId || '',
            categoryIds: product.categoryIds || [],
            published: product.published || false,
            featured: product.featured || false,
            imageUrls: normalizedMedia,
            featuredImageIndex:
              featuredIndexFromApi >= 0 && featuredIndexFromApi < normalizedMedia.length
                ? featuredIndexFromApi
                : 0,
            variants: [mergedVariant], // Single variant with all colors and sizes
            labels: (product.labels || []).map((label: any) => ({
              id: label.id || '',
              type: label.type || 'text',
              value: label.value || '',
              position: label.position || 'top-left',
              color: label.color || null,
            })),
          });
          
          // Reset new brand/category fields when loading existing product
          setUseNewBrand(false);
          setUseNewCategory(false);
          setNewBrandName('');
          setNewCategoryName('');
          setNewCategoryRequiresSizes(false);
          
          console.log('✅ [ADMIN] Product loaded for edit');
        } catch (err: any) {
          console.error('❌ [ADMIN] Error loading product:', err);
          alert(`Error loading product: ${err.message || 'Unknown error'}`);
          router.push('/admin/products');
        } finally {
          setLoadingProduct(false);
        }
      };
      
      loadProduct();
    }
  }, [productId, isLoggedIn, isAdmin, router, attributes]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-|]/g, '') // Allow pipe character (|) in slug
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  // Check if selected category requires sizes
  const isClothingCategory = () => {
    // If adding new category and requiresSizes is checked, return true
    if (useNewCategory && newCategoryRequiresSizes) {
      console.log('🔍 [VALIDATION] isClothingCategory: true (new category with requiresSizes)');
      return true;
    }
    
    // If no category selected, return false
    if (!formData.primaryCategoryId) {
      console.log('🔍 [VALIDATION] isClothingCategory: false (no category selected)');
      return false;
    }
    
    const selectedCategory = categories.find((cat) => cat.id === formData.primaryCategoryId);
    if (!selectedCategory) {
      console.log('🔍 [VALIDATION] isClothingCategory: false (category not found)');
      return false;
    }
    
    // Only check if category has requiresSizes field explicitly set to true
    // If undefined or false, return false (sizes not required)
    const requiresSizes = selectedCategory.requiresSizes === true;
    console.log('🔍 [VALIDATION] isClothingCategory:', requiresSizes, {
      categoryId: selectedCategory.id,
      categoryTitle: selectedCategory.title,
      requiresSizes: selectedCategory.requiresSizes
    });
    return requiresSizes;
  };

  // Variant management functions
  const addVariant = () => {
    const newVariant: Variant = {
      id: `variant-${Date.now()}`,
      price: '',
      compareAtPrice: '',
      stock: '',
      sku: '',
      color: '',
      colors: [],
      colorStocks: {},
      colorLabels: {},
      size: '',
      sizes: [],
      sizeStocks: {},
      sizeLabels: {},
      imageUrl: '',
    };
    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, newVariant],
    }));
  };

  // Toggle color selection for variant
  const toggleVariantColor = (variantId: string, colorValue: string) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => {
        if (v.id === variantId) {
          const colors = v.colors || [];
          const colorStocks = v.colorStocks || {};
          const colorIndex = colors.indexOf(colorValue);
          if (colorIndex > -1) {
            // Remove color
            const newColors = colors.filter((c) => c !== colorValue);
            const newColorStocks = { ...colorStocks };
            const newColorLabels = { ...(v.colorLabels || {}) };
            delete newColorStocks[colorValue];
            delete newColorLabels[colorValue];
            return { 
              ...v, 
              colors: newColors, 
              color: newColors[0] || '',
              colorStocks: newColorStocks,
              colorLabels: newColorLabels,
            };
          } else {
            // Add color
            const newColors = [...colors, colorValue];
            return { 
              ...v, 
              colors: newColors, 
              color: newColors[0] || '',
              colorStocks: { ...colorStocks, [colorValue]: '' },
            };
          }
        }
        return v;
      }),
    }));
  };

  // Update stock for a specific color
  const updateColorStock = (variantId: string, colorValue: string, stock: string) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => {
        if (v.id === variantId) {
          return {
            ...v,
            colorStocks: {
              ...(v.colorStocks || {}),
              [colorValue]: stock,
            },
          };
        }
        return v;
      }),
    }));
  };

  // Toggle size selection for variant
  const toggleVariantSize = (variantId: string, sizeValue: string) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => {
        if (v.id === variantId) {
          const sizes = v.sizes || [];
          const sizeStocks = v.sizeStocks || {};
          const sizeIndex = sizes.indexOf(sizeValue);
          if (sizeIndex > -1) {
            // Remove size
            const newSizes = sizes.filter((s) => s !== sizeValue);
            const newSizeStocks = { ...sizeStocks };
            const newSizeLabels = { ...(v.sizeLabels || {}) };
            delete newSizeStocks[sizeValue];
            delete newSizeLabels[sizeValue];
            return { 
              ...v, 
              sizes: newSizes, 
              size: newSizes[0] || '',
              sizeStocks: newSizeStocks,
              sizeLabels: newSizeLabels,
            };
          } else {
            // Add size
            const newSizes = [...sizes, sizeValue];
            return { 
              ...v, 
              sizes: newSizes, 
              size: newSizes[0] || '',
              sizeStocks: { ...sizeStocks, [sizeValue]: '' },
            };
          }
        }
        return v;
      }),
    }));
  };

  // Update stock for a specific size
  const updateSizeStock = (variantId: string, sizeValue: string, stock: string) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => {
        if (v.id === variantId) {
          return {
            ...v,
            sizeStocks: {
              ...(v.sizeStocks || {}),
              [sizeValue]: stock,
            },
          };
        }
        return v;
      }),
    }));
  };

  // Add new color directly to variant
  const addNewColorToVariant = (variantId: string, colorName: string) => {
    if (!colorName.trim()) return;
    
    const trimmedName = colorName.trim();
    const colorValue = generateSlug(trimmedName);
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => {
        if (v.id === variantId) {
          const colors = v.colors || [];
          const colorStocks = v.colorStocks || {};
          const colorLabels = v.colorLabels || {};
          
          // Check if color already exists
          if (colors.includes(colorValue)) {
            return v; // Color already exists, don't add again
          }
          
          // Add new color with original label and empty stock
          return {
            ...v,
            colors: [...colors, colorValue],
            color: colors.length === 0 ? colorValue : v.color,
            colorStocks: { ...colorStocks, [colorValue]: '' },
            colorLabels: { ...colorLabels, [colorValue]: trimmedName },
          };
        }
        return v;
      }),
    }));
  };

  // Add new size directly to variant
  const addNewSizeToVariant = (variantId: string, sizeName: string) => {
    if (!sizeName.trim()) return;
    
    const trimmedName = sizeName.trim();
    const sizeValue = generateSlug(trimmedName);
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => {
        if (v.id === variantId) {
          const sizes = v.sizes || [];
          const sizeStocks = v.sizeStocks || {};
          const sizeLabels = v.sizeLabels || {};
          
          // Check if size already exists
          if (sizes.includes(sizeValue)) {
            return v; // Size already exists, don't add again
          }
          
          // Add new size with original label and empty stock
          return {
            ...v,
            sizes: [...sizes, sizeValue],
            size: sizes.length === 0 ? sizeValue : v.size,
            sizeStocks: { ...sizeStocks, [sizeValue]: '' },
            sizeLabels: { ...sizeLabels, [sizeValue]: trimmedName },
          };
        }
        return v;
      }),
    }));
  };

  const removeVariant = (variantId: string) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((v) => v.id !== variantId),
    }));
  };

  const updateVariant = (variantId: string, field: keyof Variant, value: string) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v) =>
        v.id === variantId ? { ...v, [field]: value } : v
      ),
    }));
  };

  const addImageUrl = () => {
    setFormData((prev) => ({
      ...prev,
      imageUrls: [...prev.imageUrls, ''],
    }));
  };

  const removeImageUrl = (index: number) => {
    setFormData((prev) => {
      const newUrls = prev.imageUrls.filter((_, i) => i !== index);
      let featuredIndex = prev.featuredImageIndex;
      if (index === featuredIndex) {
        featuredIndex = 0;
      } else if (index < featuredIndex) {
        featuredIndex = Math.max(0, featuredIndex - 1);
      }
      return {
        ...prev,
        imageUrls: newUrls,
        featuredImageIndex: newUrls.length === 0 ? 0 : Math.min(featuredIndex, newUrls.length - 1),
      };
    });
  };

  const updateImageUrl = (index: number, url: string) => {
    setFormData((prev) => {
      const newUrls = [...prev.imageUrls];
      newUrls[index] = url;
      return { ...prev, imageUrls: newUrls };
    });
  };

  const setFeaturedImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      featuredImageIndex: index,
    }));
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleUploadImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    setImageUploadLoading(true);
    setImageUploadError(null);
    try {
      const uploadedImages = await Promise.all(
        files.map(async (file) => {
          if (!file.type.startsWith('image/')) {
            throw new Error(`"${file.name}" is not an image file`);
          }
          const base64 = await fileToBase64(file);
          return base64;
        })
      );

      setFormData((prev) => ({
        ...prev,
        imageUrls: [...prev.imageUrls, ...uploadedImages],
      }));
    } catch (error: any) {
      setImageUploadError(error?.message || 'Failed to process selected images');
    } finally {
      setImageUploadLoading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Label management functions
  const addLabel = () => {
    const newLabel: ProductLabel = {
      type: 'text',
      value: '',
      position: 'top-left',
      color: null,
    };
    setFormData((prev) => ({
      ...prev,
      labels: [...prev.labels, newLabel],
    }));
  };

  const removeLabel = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      labels: prev.labels.filter((_, i) => i !== index),
    }));
  };

  const updateLabel = (index: number, field: keyof ProductLabel, value: any) => {
    setFormData((prev) => {
      const newLabels = [...prev.labels];
      newLabels[index] = { ...newLabels[index], [field]: value };
      return { ...prev, labels: newLabels };
    });
  };

  const getColorAttribute = () => attributes.find((attr) => attr.key === 'color');
  const getSizeAttribute = () => attributes.find((attr) => attr.key === 'size');

  // Add new color to color attribute
  const handleAddColor = async () => {
    setColorMessage(null);
    const colorAttribute = getColorAttribute();
    if (!colorAttribute) {
      setColorMessage({ type: 'error', text: 'Color attribute not found' });
      return;
    }

    if (!newColorName.trim()) {
      setColorMessage({ type: 'error', text: 'Color name is required' });
      return;
    }

    try {
      setAddingColor(true);
      const response = await apiClient.post<{ data: Attribute }>(`/api/v1/admin/attributes/${colorAttribute.id}/values`, {
        label: newColorName.trim(),
        locale: 'en',
      });
      
      if (response.data) {
        // Update attributes list
        setAttributes((prev) => 
          prev.map((attr) => 
            attr.id === colorAttribute.id ? response.data : attr
          )
        );
        setColorMessage({ type: 'success', text: `Color "${newColorName.trim()}" added successfully` });
        setNewColorName('');
        // Clear message after 3 seconds
        setTimeout(() => setColorMessage(null), 3000);
      }
    } catch (err: any) {
      setColorMessage({ type: 'error', text: err.message || 'Failed to add color' });
    } finally {
      setAddingColor(false);
    }
  };

  // Add new size to size attribute
  const handleAddSize = async () => {
    setSizeMessage(null);
    const sizeAttribute = getSizeAttribute();
    if (!sizeAttribute) {
      setSizeMessage({ type: 'error', text: 'Size attribute not found' });
      return;
    }

    if (!newSizeName.trim()) {
      setSizeMessage({ type: 'error', text: 'Size name is required' });
      return;
    }

    try {
      setAddingSize(true);
      const response = await apiClient.post<{ data: Attribute }>(`/api/v1/admin/attributes/${sizeAttribute.id}/values`, {
        label: newSizeName.trim(),
        locale: 'en',
      });
      
      if (response.data) {
        // Update attributes list
        setAttributes((prev) => 
          prev.map((attr) => 
            attr.id === sizeAttribute.id ? response.data : attr
          )
        );
        setSizeMessage({ type: 'success', text: `Size "${newSizeName.trim()}" added successfully` });
        setNewSizeName('');
        // Clear message after 3 seconds
        setTimeout(() => setSizeMessage(null), 3000);
      }
    } catch (err: any) {
      setSizeMessage({ type: 'error', text: err.message || 'Failed to add size' });
    } finally {
      setAddingSize(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('📝 [ADMIN] Submitting product form:', formData);

      // Create new brand if provided
      let finalBrandId = formData.brandId;
      if (useNewBrand && newBrandName.trim()) {
        try {
          console.log('🏷️ [ADMIN] Creating new brand:', newBrandName);
          const brandResponse = await apiClient.post<{ data: Brand }>('/api/v1/admin/brands', {
            name: newBrandName.trim(),
            locale: 'en',
          });
          if (brandResponse.data) {
            finalBrandId = brandResponse.data.id;
            // Add to brands list for future use
            setBrands((prev) => [...prev, brandResponse.data]);
            console.log('✅ [ADMIN] Brand created:', brandResponse.data.id);
          }
        } catch (err: any) {
          console.error('❌ [ADMIN] Error creating brand:', err);
          const errorMessage = err?.data?.detail || err?.message || 'Unknown error';
          alert(`Չհաջողվեց ստեղծել brand: ${errorMessage}`);
          setLoading(false);
          return;
        }
      }

      // Create new category if provided
      let finalPrimaryCategoryId = formData.primaryCategoryId;
      if (useNewCategory && newCategoryName.trim()) {
        try {
          console.log('📁 [ADMIN] Creating new category:', newCategoryName, 'requiresSizes:', newCategoryRequiresSizes);
          const categoryResponse = await apiClient.post<{ data: Category }>('/api/v1/admin/categories', {
            title: newCategoryName.trim(),
            locale: 'en',
            requiresSizes: newCategoryRequiresSizes,
          });
          if (categoryResponse.data) {
            finalPrimaryCategoryId = categoryResponse.data.id;
            // Add to categories list for future use
            setCategories((prev) => [...prev, categoryResponse.data]);
            console.log('✅ [ADMIN] Category created:', categoryResponse.data.id, 'requiresSizes:', categoryResponse.data.requiresSizes);
          }
        } catch (err: any) {
          console.error('❌ [ADMIN] Error creating category:', err);
          alert(`Չհաջողվեց ստեղծել կատեգորիա: ${err.message || 'Unknown error'}`);
          setLoading(false);
          return;
        }
      }

      // Validate that at least one variant exists
      if (formData.variants.length === 0) {
        alert('Please add at least one product variant');
        setLoading(false);
        return;
      }

      // Validate all variants
      const skuSet = new Set<string>();
      for (const variant of formData.variants) {
        const variantIndex = formData.variants.indexOf(variant) + 1;
        
        const priceValue = parseFloat(variant.price);
        if (!variant.price || isNaN(priceValue) || priceValue <= 0) {
          alert(`Վարիանտ ${variantIndex}: Խնդրում ենք մուտքագրել վավեր գին, որը 0-ից մեծ է`);
          setLoading(false);
          return;
        }
        
        // Validate SKU - must be unique within product
        const variantSku = variant.sku ? variant.sku.trim() : '';
        if (!variantSku || variantSku === '') {
          alert(`Վարիանտ ${variantIndex}: SKU-ն պարտադիր է: Խնդրում ենք մուտքագրել SKU կամ օգտագործել "Գեներացնել" կոճակը`);
          setLoading(false);
          return;
        }
        
        if (skuSet.has(variantSku)) {
          alert(`Վարիանտ ${variantIndex}: SKU "${variantSku}" արդեն օգտագործված է այս ապրանքի մեջ: Ամեն վարիանտի SKU-ն պետք է եզակի լինի`);
          setLoading(false);
          return;
        }
        skuSet.add(variantSku);
        
        // Validate sizes and stocks for clothing and shoes
        const categoryRequiresSizes = isClothingCategory();
        
        // Check if variant has sizes (either from array or simple text field)
        const hasSizesArray = variant.sizes && variant.sizes.length > 0;
        const hasSimpleSize = variant.size && variant.size.trim() !== '';
        const hasAnySize = hasSizesArray || hasSimpleSize;
        
        console.log('🔍 [VALIDATION] Checking variant:', {
          variantIndex: formData.variants.indexOf(variant) + 1,
          categoryRequiresSizes,
          hasSizesArray,
          hasSimpleSize,
          hasAnySize,
          sizes: variant.sizes,
          simpleSize: variant.size,
          variant: variant
        });
        
        if (categoryRequiresSizes) {
          // If category requires sizes, check if variant has at least one size
          if (!hasAnySize) {
            console.error('❌ [VALIDATION] Size validation failed for variant:', {
              variant,
              categoryRequiresSizes,
              hasSizesArray,
              hasSimpleSize,
              selectedCategory: categories.find((cat) => cat.id === formData.primaryCategoryId),
              formDataPrimaryCategoryId: formData.primaryCategoryId
            });
            alert(`Վարիանտ ${formData.variants.indexOf(variant) + 1}: Այս կատեգորիայի համար պահանջվում է առնվազն մեկ չափս`);
            setLoading(false);
            return;
          }
          
          // If using sizes array, validate stock for each size
          if (hasSizesArray) {
            const sizes = variant.sizes || [];
            console.log('🔍 [VALIDATION] Category requires sizes, checking variant sizes:', sizes);
            
            for (const size of sizes) {
              const stock = (variant.sizeStocks || {})[size];
              if (!stock || stock.trim() === '' || parseInt(stock) < 0) {
                const sizeLabel = getSizeAttribute()?.values.find((v) => v.value === size)?.label || size;
                alert(`Վարիանտ ${formData.variants.indexOf(variant) + 1}: Խնդրում ենք մուտքագրել պահեստ "${sizeLabel}" չափսի համար`);
                setLoading(false);
                return;
              }
            }
          }
          // If using simple size field, validate general stock
          else if (hasSimpleSize && (!variant.stock || variant.stock.trim() === '' || parseInt(variant.stock) < 0)) {
            alert(`Վարիանտ ${formData.variants.indexOf(variant) + 1}: Խնդրում ենք մուտքագրել պահեստ`);
            setLoading(false);
            return;
          }
        }

        // Validate colors and stocks
        const colors = variant.colors && variant.colors.length > 0 ? variant.colors : [];
        if (colors.length > 0) {
          for (const color of colors) {
            const stock = (variant.colorStocks || {})[color];
            if (!stock || stock.trim() === '' || parseInt(stock) < 0) {
              const colorLabel = getColorAttribute()?.values.find((v) => v.value === color)?.label || color;
              alert(`Variant ${formData.variants.indexOf(variant) + 1}: Please enter stock for color "${colorLabel}"`);
              setLoading(false);
              return;
            }
          }
        } else if (!variant.stock || parseInt(variant.stock) < 0) {
          // If no colors, validate general stock (only if no sizes or not clothing)
          if (!isClothingCategory() || (variant.sizes || []).length === 0) {
            alert(`Variant ${formData.variants.indexOf(variant) + 1}: Please enter stock`);
            setLoading(false);
            return;
          }
        }
      }

      // Prepare media array
      const orderedImageUrls = [...formData.imageUrls];
      if (
        orderedImageUrls.length > 0 &&
        formData.featuredImageIndex >= 0 &&
        formData.featuredImageIndex < orderedImageUrls.length
      ) {
        const [featured] = orderedImageUrls.splice(formData.featuredImageIndex, 1);
        orderedImageUrls.unshift(featured);
      }

      const media = orderedImageUrls
        .filter((url) => url.trim())
        .map((url, index) => ({
          url: url.trim(),
          type: 'image',
          position: index,
          isFeatured: index === 0,
        }));

      // Prepare variants array
      // Create variants for all combinations of colors and sizes with their respective stocks
      const variants: any[] = [];
      
      formData.variants.forEach((variant) => {
        const baseVariantData: any = {
          price: parseFloat(variant.price),
          published: true,
        };

        if (variant.compareAtPrice) {
          baseVariantData.compareAtPrice = parseFloat(variant.compareAtPrice);
        }

        if (variant.imageUrl) {
          baseVariantData.imageUrl = variant.imageUrl;
        }

        // Use colors from array if available, otherwise use simple color field
        let colors = variant.colors && variant.colors.length > 0 ? variant.colors : [];
        if (colors.length === 0 && variant.color && variant.color.trim() !== '') {
          colors = [variant.color.trim()];
        }
        
        // Use sizes from array if available, otherwise use simple size field
        let sizes = variant.sizes && variant.sizes.length > 0 ? variant.sizes : [];
        if (sizes.length === 0 && variant.size && variant.size.trim() !== '') {
          sizes = [variant.size.trim()];
        }
        
        const colorStocks = variant.colorStocks || {};
        const sizeStocks = variant.sizeStocks || {};

        // If we have both colors and sizes, create variants for all combinations
        if (colors.length > 0 && sizes.length > 0) {
          colors.forEach((color, colorIndex) => {
            sizes.forEach((size, sizeIndex) => {
              // For clothing, prioritize size stock; otherwise use color stock
              // If both exist, use size stock for clothing, color stock for others
              let stockForVariant = '0';
              if (isClothingCategory() && sizeStocks[size]) {
                stockForVariant = sizeStocks[size];
              } else if (colorStocks[color]) {
                stockForVariant = colorStocks[color];
              } else if (sizeStocks[size]) {
                stockForVariant = sizeStocks[size];
              } else {
                stockForVariant = variant.stock || '0';
              }
              
              const skuSuffix = colors.length > 1 || sizes.length > 1 
                ? `-${colorIndex + 1}-${sizeIndex + 1}` 
                : '';
              
              // Generate SKU if not provided
              let finalSku = variant.sku ? `${variant.sku.trim()}${skuSuffix}` : undefined;
              if (!finalSku || finalSku === '') {
                const baseSlug = formData.slug || 'PROD';
                finalSku = `${baseSlug.toUpperCase()}-${Date.now()}-${colorIndex + 1}-${sizeIndex + 1}`;
              }
              
              variants.push({
                ...baseVariantData,
                color: color,
                size: size,
                stock: parseInt(stockForVariant) || 0,
                sku: finalSku,
              });
            });
          });
        } 
        // If we have only colors
        else if (colors.length > 0) {
          colors.forEach((color, colorIndex) => {
            const stockForColor = colorStocks[color] || variant.stock || '0';
            const skuSuffix = colors.length > 1 ? `-${colorIndex + 1}` : '';
            
            // Generate SKU if not provided
            let finalSku = variant.sku ? `${variant.sku.trim()}${skuSuffix}` : undefined;
            if (!finalSku || finalSku === '') {
              const baseSlug = formData.slug || 'PROD';
              finalSku = `${baseSlug.toUpperCase()}-${Date.now()}-${colorIndex + 1}`;
            }
            
            variants.push({
              ...baseVariantData,
              color: color,
              stock: parseInt(stockForColor) || 0,
              sku: finalSku,
            });
          });
        }
        // If we have only sizes (for clothing)
        else if (sizes.length > 0) {
          sizes.forEach((size, sizeIndex) => {
            const stockForSize = sizeStocks[size] || variant.stock || '0';
            const skuSuffix = sizes.length > 1 ? `-${sizeIndex + 1}` : '';
            
            // Generate SKU if not provided
            let finalSku = variant.sku ? `${variant.sku.trim()}${skuSuffix}` : undefined;
            if (!finalSku || finalSku === '') {
              const baseSlug = formData.slug || 'PROD';
              finalSku = `${baseSlug.toUpperCase()}-${Date.now()}-${sizeIndex + 1}`;
            }
            
            variants.push({
              ...baseVariantData,
              size: size,
              stock: parseInt(stockForSize) || 0,
              sku: finalSku,
            });
          });
        } 
        // If no colors and no sizes, create single variant
        else {
          // Generate SKU if not provided
          let finalSku = variant.sku ? variant.sku.trim() : undefined;
          if (!finalSku || finalSku === '') {
            const baseSlug = formData.slug || 'PROD';
            finalSku = `${baseSlug.toUpperCase()}-${Date.now()}-1`;
          }
          
          const singleVariant: any = {
            ...baseVariantData,
            stock: parseInt(variant.stock) || 0,
            sku: finalSku,
          };
          
          // Add color if provided in simple text field
          if (variant.color && variant.color.trim() !== '') {
            singleVariant.color = variant.color.trim();
          }
          
          // Add size if provided in simple text field
          if (variant.size && variant.size.trim() !== '') {
            singleVariant.size = variant.size.trim();
          }
          
          variants.push(singleVariant);
        }
      });

      // Final validation - ensure all SKUs are unique
      const finalSkuSet = new Set<string>();
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        if (!variant.sku || variant.sku.trim() === '') {
          // Generate SKU if still missing
          const baseSlug = formData.slug || 'PROD';
          variant.sku = `${baseSlug.toUpperCase()}-${Date.now()}-${i + 1}`;
        } else {
          variant.sku = variant.sku.trim();
        }
        
        if (finalSkuSet.has(variant.sku)) {
          // Duplicate SKU found, generate new one
          const baseSlug = formData.slug || 'PROD';
          variant.sku = `${baseSlug.toUpperCase()}-${Date.now()}-${i + 1}-${Math.random().toString(36).substr(2, 4)}`;
        }
        finalSkuSet.add(variant.sku);
      }

      // Final validation - check size requirement for categories that require sizes
      const categoryRequiresSizesFinal = isClothingCategory();
      if (categoryRequiresSizesFinal && finalPrimaryCategoryId) {
        const hasSizeInFinalVariants = variants.some(
          (variant) => variant.size && variant.size.trim() !== ""
        );

        if (!hasSizeInFinalVariants) {
          console.error('❌ [VALIDATION] Final size validation failed. Variants:', variants);
          alert('At least one size is required for this product category');
          setLoading(false);
          return;
        }
        console.log('✅ [VALIDATION] Final size validation passed');
      } else {
        console.log('ℹ️ [VALIDATION] Size validation skipped (category does not require sizes)');
      }

      // Prepare payload
      const payload: any = {
        title: formData.title,
        slug: formData.slug,
        subtitle: formData.subtitle || undefined,
        descriptionHtml: formData.descriptionHtml || undefined,
        brandId: finalBrandId || undefined,
        primaryCategoryId: finalPrimaryCategoryId || undefined,
        categoryIds: formData.categoryIds.length > 0 ? formData.categoryIds : undefined,
        published: formData.published,
      featured: formData.featured,
        locale: 'en',
        variants: variants,
      };

      // Add media if provided
      if (media.length > 0) {
        payload.media = media;
      }

      // Add labels if provided
      if (formData.labels && formData.labels.length > 0) {
        payload.labels = formData.labels
          .filter((label) => label.value && label.value.trim() !== '')
          .map((label) => ({
            type: label.type,
            value: label.value.trim(),
            position: label.position,
            color: label.color || null,
          }));
      }

      console.log('📤 [ADMIN] Sending payload:', JSON.stringify(payload, null, 2));
      
      if (isEditMode && productId) {
        // Update existing product
        const product = await apiClient.put(`/api/v1/admin/products/${productId}`, payload);
        console.log('✅ [ADMIN] Product updated:', product);
        alert('Ապրանքը հաջողությամբ թարմացվեց!');
      } else {
        // Create new product
        const product = await apiClient.post('/api/v1/admin/products', payload);
        console.log('✅ [ADMIN] Product created:', product);
        alert('Ապրանքը հաջողությամբ ստեղծվեց!');
      }
      
      router.push('/admin/products');
    } catch (err: any) {
      console.error('❌ [ADMIN] Error saving product:', err);
      
      // Extract error message from API response
      let errorMessage = isEditMode ? 'Չհաջողվեց թարմացնել ապրանքը' : 'Չհաջողվեց ստեղծել ապրանքը';
      
      // Try different error response formats
      if (err?.data?.detail) {
        errorMessage = err.data.detail;
      } else if (err?.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err?.message) {
        // If error message contains HTML, try to extract meaningful text
        if (err.message.includes('<!DOCTYPE') || err.message.includes('<html')) {
          // Try to extract MongoDB error from HTML
          const mongoErrorMatch = err.message.match(/MongoServerError[^<]+/);
          if (mongoErrorMatch) {
            errorMessage = `Տվյալների բազայի սխալ: ${mongoErrorMatch[0]}`;
          } else {
            errorMessage = 'Տվյալների բազայի սխալ: SKU-ն արդեն օգտագործված է կամ այլ սխալ:';
          }
        } else {
          errorMessage = err.message;
        }
      }
      
      // Show user-friendly error message
      alert(`Սխալ: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loadingProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{loadingProduct ? 'Loading product...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin Panel
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{isEditMode ? 'Edit Product' : 'Add New Product'}</h1>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={handleTitleChange}
                    required
                    placeholder="Product title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug *
                  </label>
                  <Input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    required
                    placeholder="product-slug"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subtitle
                  </label>
                  <Input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Product subtitle"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={6}
                    value={formData.descriptionHtml}
                    onChange={(e) => setFormData((prev) => ({ ...prev, descriptionHtml: e.target.value }))}
                    placeholder="Product description (HTML supported)"
                  />
                </div>
              </div>
            </div>

            {/* Categories & Brand */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Categories & Brand</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Category
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        id="select-category"
                        name="category-mode"
                        checked={!useNewCategory}
                        onChange={() => {
                          setUseNewCategory(false);
                          setNewCategoryName('');
                          setNewCategoryRequiresSizes(false);
                          setFormData((prev) => ({ ...prev, primaryCategoryId: '' }));
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor="select-category" className="text-sm text-gray-700">
                        Select existing category
                      </label>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        id="new-category"
                        name="category-mode"
                        checked={useNewCategory}
                        onChange={() => {
                          setUseNewCategory(true);
                          setNewCategoryRequiresSizes(false);
                          setFormData((prev) => ({ ...prev, primaryCategoryId: '' }));
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor="new-category" className="text-sm text-gray-700">
                        Add new category
                      </label>
                    </div>
                    {!useNewCategory ? (
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.primaryCategoryId}
                        onChange={(e) => {
                          const newCategoryId = e.target.value;
                          const selectedCategory = categories.find((cat) => cat.id === newCategoryId);
                          const newIsSizeRequired = selectedCategory
                            ? (selectedCategory.requiresSizes !== undefined 
                                ? selectedCategory.requiresSizes 
                                : (() => {
                                    // Fallback: Check by slug or title
                                    const sizeRequiredSlugs = ['clothing', 'odezhda', 'hagust', 'apparel', 'fashion', 'shoes', 'koshik', 'obuv'];
                                    const sizeRequiredTitles = ['clothing', 'одежда', 'հագուստ', 'apparel', 'fashion', 'shoes', 'կոշիկ', 'обувь'];
                                    return (
                                      sizeRequiredSlugs.some((slug) => selectedCategory.slug.toLowerCase().includes(slug)) ||
                                      sizeRequiredTitles.some((title) => selectedCategory.title.toLowerCase().includes(title))
                                    );
                                  })())
                            : false;
                          
                          setFormData((prev) => {
                            // If switching from size-required category to non-size-required, clear sizes
                            const wasSizeRequired = isClothingCategory();
                            if (wasSizeRequired && !newIsSizeRequired) {
                              return {
                                ...prev,
                                primaryCategoryId: newCategoryId,
                                variants: prev.variants.map((v) => ({
                                  ...v,
                                  sizes: [],
                                  sizeStocks: {},
                                  size: '',
                                })),
                              };
                            }
                            return { ...prev, primaryCategoryId: newCategoryId };
                          });
                        }}
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-3">
                        <Input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Enter new category name"
                          className="w-full"
                        />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newCategoryRequiresSizes}
                            onChange={(e) => setNewCategoryRequiresSizes(e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            This category requires sizes (e.g., clothing, shoes)
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        id="select-brand"
                        name="brand-mode"
                        checked={!useNewBrand}
                        onChange={() => {
                          setUseNewBrand(false);
                          setNewBrandName('');
                          setFormData((prev) => ({ ...prev, brandId: '' }));
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor="select-brand" className="text-sm text-gray-700">
                        Select existing brand
                      </label>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        id="new-brand"
                        name="brand-mode"
                        checked={useNewBrand}
                        onChange={() => {
                          setUseNewBrand(true);
                          setFormData((prev) => ({ ...prev, brandId: '' }));
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor="new-brand" className="text-sm text-gray-700">
                        Add new brand
                      </label>
                    </div>
                    {!useNewBrand ? (
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.brandId}
                        onChange={(e) => setFormData((prev) => ({ ...prev, brandId: e.target.value }))}
                      >
                        <option value="">Select brand</option>
                        {brands.map((brand) => (
                          <option key={brand.id} value={brand.id}>
                            {brand.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        type="text"
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        placeholder="Enter new brand name"
                        className="w-full"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Images */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Images</h2>
              <p className="text-sm text-gray-600 mb-4">
                Upload images directly or paste image URLs. Mark one image as the main/featured photo to show everywhere first.
              </p>

              {imageUploadError && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {imageUploadError}
                </div>
              )}

              <div className="space-y-3">
                {formData.imageUrls.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
                    No images added yet. Upload files or paste image URLs to get started.
                  </div>
                ) : (
                  formData.imageUrls.map((url, index) => (
                    <div
                      key={`${url}-${index}`}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="sm:w-40">
                          <div className="aspect-square w-full rounded-md border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                            {url ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`Preview ${index + 1}`}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </>
                            ) : (
                              <span className="text-xs text-gray-400">No preview</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 space-y-3">
                          <Input
                            type="url"
                            value={url}
                            onChange={(e) => updateImageUrl(index, e.target.value)}
                            placeholder="https://example.com/image.jpg"
                          />
                          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="featured-image"
                                checked={formData.featuredImageIndex === index}
                                onChange={() => setFeaturedImage(index)}
                              />
                              Set as main image
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => removeImageUrl(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploadLoading}
                  className="w-full sm:w-auto"
                >
                  {imageUploadLoading ? 'Processing...' : 'Upload Images'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addImageUrl}
                  className="w-full sm:w-auto"
                >
                  + Add Image URL
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleUploadImages}
              />
            </div>

            {/* Product Labels */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Product Labels</h2>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addLabel}
                >
                  + Add Label
                </Button>
              </div>
              {formData.labels.length === 0 ? (
                <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-2">No labels added yet</p>
                  <p className="text-sm text-gray-400">Add labels like "New Product", "Hot", "Sale" or percentage discounts like "50%"</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.labels.map((label, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Label {index + 1}</h3>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeLabel(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Label Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type *
                          </label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={label.type}
                            onChange={(e) => updateLabel(index, 'type', e.target.value as 'text' | 'percentage')}
                            required
                          >
                            <option value="text">Text (New Product, Hot, Sale, etc.)</option>
                            <option value="percentage">Percentage (50%, 30%, etc.)</option>
                          </select>
                        </div>

                        {/* Label Value */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Value *
                          </label>
                          <Input
                            type="text"
                            value={label.value}
                            onChange={(e) => updateLabel(index, 'value', e.target.value)}
                            placeholder={label.type === 'percentage' ? '50 (will be auto-updated)' : 'New Product'}
                            required
                            className="w-full"
                          />
                          {label.type === 'percentage' && (
                            <p className="mt-1 text-xs text-blue-600 font-medium">
                              ⓘ This value will be automatically updated based on the product's discount percentage. You can enter any number here as a placeholder.
                            </p>
                          )}
                        </div>

                        {/* Label Position */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Position *
                          </label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={label.position}
                            onChange={(e) => updateLabel(index, 'position', e.target.value)}
                            required
                          >
                            <option value="top-left">Top Left</option>
                            <option value="top-right">Top Right</option>
                            <option value="bottom-left">Bottom Left</option>
                            <option value="bottom-right">Bottom Right</option>
                          </select>
                        </div>

                        {/* Label Color (Optional) */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Color (Optional)
                          </label>
                          <Input
                            type="text"
                            value={label.color || ''}
                            onChange={(e) => updateLabel(index, 'color', e.target.value || null)}
                            placeholder="#FF0000 or leave empty for default"
                            className="w-full"
                          />
                          <p className="mt-1 text-xs text-gray-500">Hex color code (e.g., #FF0000) or leave empty</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Variants */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Product Variants</h2>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addVariant}
                >
                  + Add Variant
                </Button>
              </div>
              
              {formData.variants.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-4">No variants added yet</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addVariant}
                  >
                    Add First Variant
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.variants.map((variant, index) => (
                    <div key={variant.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Variant {index + 1}</h3>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeVariant(variant.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Price */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price *
                          </label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={variant.price}
                            onChange={(e) => {
                              let value = e.target.value;
                              value = value.replace(/[^\d.]/g, '');
                              const parts = value.split('.');
                              if (parts.length > 2) {
                                value = parts[0] + '.' + parts.slice(1).join('');
                              }
                              if (parts.length === 2 && parts[1].length > 2) {
                                value = parts[0] + '.' + parts[1].substring(0, 2);
                              }
                              updateVariant(variant.id, 'price', value);
                            }}
                            onBlur={(e) => {
                              const value = e.target.value.trim();
                              if (value && !isNaN(parseFloat(value))) {
                                const numValue = parseFloat(value);
                                if (numValue > 0) {
                                  updateVariant(variant.id, 'price', numValue.toFixed(2));
                                }
                              }
                            }}
                            required
                            placeholder="0.00"
                            className="w-full"
                          />
                        </div>

                        {/* Compare At Price */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Compare At Price
                          </label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={variant.compareAtPrice}
                            onChange={(e) => {
                              let value = e.target.value;
                              value = value.replace(/[^\d.]/g, '');
                              const parts = value.split('.');
                              if (parts.length > 2) {
                                value = parts[0] + '.' + parts.slice(1).join('');
                              }
                              if (parts.length === 2 && parts[1].length > 2) {
                                value = parts[0] + '.' + parts[1].substring(0, 2);
                              }
                              updateVariant(variant.id, 'compareAtPrice', value);
                            }}
                            onBlur={(e) => {
                              const value = e.target.value.trim();
                              if (value && !isNaN(parseFloat(value))) {
                                const numValue = parseFloat(value);
                                if (numValue > 0) {
                                  updateVariant(variant.id, 'compareAtPrice', numValue.toFixed(2));
                                }
                              }
                            }}
                            placeholder="0.00"
                            className="w-full"
                          />
                        </div>

                        {/* Stock - Only show if no colors selected or single color */}
                        {(variant.colors || []).length <= 1 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Stock *
                            </label>
                            <Input
                              type="number"
                              value={variant.stock}
                              onChange={(e) => updateVariant(variant.id, 'stock', e.target.value)}
                              required
                              placeholder="0"
                              className="w-full"
                            />
                          </div>
                        )}

                        {/* SKU */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SKU *
                          </label>
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              value={variant.sku}
                              onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                              placeholder="Auto-generated if empty"
                              className="flex-1"
                              required
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                // Generate unique SKU based on product title and variant index
                                const baseSlug = formData.slug || 'PROD';
                                const variantIndex = formData.variants.findIndex(v => v.id === variant.id);
                                const generatedSku = `${baseSlug.toUpperCase()}-${Date.now()}-${variantIndex + 1}`;
                                updateVariant(variant.id, 'sku', generatedSku);
                              }}
                              className="whitespace-nowrap"
                              title="Գեներացնել SKU"
                            >
                              Գեներացնել
                            </Button>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">SKU-ն պետք է եզակի լինի ամեն վարիանտի համար</p>
                        </div>

                        {/* Color - Multiple selection with stock per color */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            <strong>Colors</strong>
                          </label>
                          
                          {/* Add new color section - at the top */}
                          <div className="mb-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                            <p className="text-sm font-medium text-gray-700 mb-3">
                              Add New Color:
                            </p>
                            <NewColorSizeInput
                              variantId={variant.id}
                              type="color"
                              onAdd={(name) => addNewColorToVariant(variant.id, name)}
                              placeholder="Enter color name (e.g. Red, Blue)"
                            />
                          </div>
                          
                          {/* Checkbox list for selecting colors - all available colors */}
                          <div className="space-y-3 mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Select Colors (checkboxes):</p>
                            
                            {/* Colors from attributes */}
                            {getColorAttribute() && getColorAttribute()!.values.length > 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-2 border-gray-300 rounded-lg bg-white max-h-64 overflow-y-auto shadow-sm">
                                {getColorAttribute()?.values.map((val) => {
                                  const isSelected = (variant.colors || []).includes(val.value);
                                  return (
                                    <label
                                      key={val.id}
                                      className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-all ${
                                        isSelected 
                                          ? 'bg-gray-100 border-gray-500 shadow-sm' 
                                          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleVariantColor(variant.id, val.value)}
                                        className="w-5 h-5 text-gray-600 border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
                                      />
                                      <span className={`text-sm font-medium ${
                                        isSelected ? 'text-gray-900' : 'text-gray-700'
                                      }`}>
                                        {val.label}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                            
                            {/* Manually added colors */}
                            {(variant.colors || []).length > 0 && (() => {
                              const manuallyAddedColors = (variant.colors || []).filter(colorValue => {
                                const colorAttribute = getColorAttribute();
                                if (!colorAttribute) return true;
                                return !colorAttribute.values.some(v => v.value === colorValue);
                              });
                              
                              if (manuallyAddedColors.length > 0) {
                                return (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-2 border-gray-300 rounded-lg bg-white max-h-64 overflow-y-auto shadow-sm">
                                    {manuallyAddedColors.map((colorValue) => {
                                      const isSelected = (variant.colors || []).includes(colorValue);
                                      const savedLabel = variant.colorLabels?.[colorValue];
                                      const colorLabel = savedLabel || 
                                        (colorValue.charAt(0).toUpperCase() + colorValue.slice(1).replace(/-/g, ' '));
                                      
                                      return (
                                        <label
                                          key={colorValue}
                                          className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-all ${
                                            isSelected 
                                              ? 'bg-gray-100 border-gray-500 shadow-sm' 
                                              : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleVariantColor(variant.id, colorValue)}
                                            className="w-5 h-5 text-gray-600 border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
                                          />
                                          <span className={`text-sm font-medium ${
                                            isSelected ? 'text-gray-900' : 'text-gray-700'
                                          }`}>
                                            {colorLabel}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            
                            {/* Show message if no colors available */}
                            {(!getColorAttribute() || getColorAttribute()!.values.length === 0) && 
                             (variant.colors || []).length === 0 && (
                              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center text-gray-500 text-sm">
                                No colors available. Add a new color above.
                              </div>
                            )}
                          </div>
                          
                          {/* Stock inputs for each selected color */}
                          {(variant.colors || []).length > 0 && (
                            <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-md border border-gray-200">
                              <p className="text-sm font-medium text-gray-700 mb-3">
                                Stock for each color:
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(variant.colors || []).map((colorValue) => {
                                  const colorFromAttribute = getColorAttribute()?.values.find(
                                    (v) => v.value === colorValue
                                  );
                                  const savedLabel = variant.colorLabels?.[colorValue];
                                  const colorLabel = colorFromAttribute?.label || 
                                    savedLabel || 
                                    (colorValue.charAt(0).toUpperCase() + colorValue.slice(1).replace(/-/g, ' '));
                                  const stockValue = (variant.colorStocks || {})[colorValue] !== undefined && (variant.colorStocks || {})[colorValue] !== null
                                    ? String((variant.colorStocks || {})[colorValue])
                                    : '';
                                  
                                  return (
                                    <div key={colorValue} className="flex items-center gap-2">
                                      <label className="text-sm text-gray-700 min-w-[100px] font-medium">
                                        {colorLabel}:
                                      </label>
                                      <Input
                                        type="number"
                                        value={stockValue}
                                        onChange={(e) => updateColorStock(variant.id, colorValue, e.target.value)}
                                        placeholder="0"
                                        required
                                        className="flex-1"
                                        min="0"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* Option to add to global attributes */}
                          {getColorAttribute() && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                              <p className="text-xs text-gray-600 mb-2">
                                Or add color to global attributes (for all products):
                              </p>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={newColorName}
                                  onChange={(e) => setNewColorName(e.target.value)}
                                  placeholder="Enter color name"
                                  className="flex-1"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddColor();
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={handleAddColor}
                                  disabled={addingColor || !newColorName.trim()}
                                  className="whitespace-nowrap text-xs"
                                >
                                  {addingColor ? 'Adding...' : '+ Add to Attributes'}
                                </Button>
                              </div>
                              {colorMessage && (
                                <div className={`mt-2 text-xs px-2 py-1 rounded ${
                                  colorMessage.type === 'success' 
                                    ? 'bg-green-50 text-green-700 border border-green-200' 
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                  {colorMessage.text}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Size - Multiple selection with stock per size */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            <strong>Sizes {isClothingCategory() ? '*' : ''}</strong>
                          </label>
                          
                          {/* Add new size section - at the top */}
                          {isClothingCategory() && (
                            <div className="mb-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                              <p className="text-sm font-medium text-gray-700 mb-3">
                                Add New Size:
                              </p>
                              <NewColorSizeInput
                                variantId={variant.id}
                                type="size"
                                onAdd={(name) => addNewSizeToVariant(variant.id, name)}
                                placeholder="Enter size name (e.g. S, M, L, XL)"
                              />
                            </div>
                          )}
                          
                          {/* Checkbox list for selecting sizes - all available sizes */}
                          <div className="space-y-3 mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Select Sizes (checkboxes):</p>
                            
                            {/* Sizes from attributes */}
                            {getSizeAttribute() && getSizeAttribute()!.values.length > 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-2 border-gray-300 rounded-lg bg-white max-h-64 overflow-y-auto shadow-sm">
                                {getSizeAttribute()?.values.map((val) => {
                                  const isSelected = (variant.sizes || []).includes(val.value);
                                  return (
                                    <label
                                      key={val.id}
                                      className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-all ${
                                        isSelected 
                                          ? 'bg-gray-100 border-gray-500 shadow-sm' 
                                          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleVariantSize(variant.id, val.value)}
                                        className="w-5 h-5 text-gray-600 border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
                                      />
                                      <span className={`text-sm font-medium ${
                                        isSelected ? 'text-gray-900' : 'text-gray-700'
                                      }`}>
                                        {val.label}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                            
                            {/* Manually added sizes */}
                            {(variant.sizes || []).length > 0 && (() => {
                              const manuallyAddedSizes = (variant.sizes || []).filter(sizeValue => {
                                const sizeAttribute = getSizeAttribute();
                                if (!sizeAttribute) return true;
                                return !sizeAttribute.values.some(v => v.value === sizeValue);
                              });
                              
                              if (manuallyAddedSizes.length > 0) {
                                return (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-2 border-gray-300 rounded-lg bg-white max-h-64 overflow-y-auto shadow-sm">
                                    {manuallyAddedSizes.map((sizeValue) => {
                                      const isSelected = (variant.sizes || []).includes(sizeValue);
                                      const savedLabel = variant.sizeLabels?.[sizeValue];
                                      const sizeLabel = savedLabel || 
                                        sizeValue.toUpperCase().replace(/-/g, ' ');
                                      
                                      return (
                                        <label
                                          key={sizeValue}
                                          className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-all ${
                                            isSelected 
                                              ? 'bg-gray-100 border-gray-500 shadow-sm' 
                                              : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleVariantSize(variant.id, sizeValue)}
                                            className="w-5 h-5 text-gray-600 border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
                                          />
                                          <span className={`text-sm font-medium ${
                                            isSelected ? 'text-gray-900' : 'text-gray-700'
                                          }`}>
                                            {sizeLabel}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            
                            {/* Show message if no sizes available */}
                            {(!getSizeAttribute() || getSizeAttribute()!.values.length === 0) && 
                             (variant.sizes || []).length === 0 && (
                              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center text-gray-500 text-sm">
                                {isClothingCategory() 
                                  ? 'No sizes available. Add a new size above.' 
                                  : 'No sizes available.'}
                              </div>
                            )}
                          </div>
                          
                          {/* Stock inputs for each selected size */}
                          {(variant.sizes || []).length > 0 && (
                            <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-md border border-gray-200">
                              <p className="text-sm font-medium text-gray-700 mb-3">
                                Stock for each size:
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(variant.sizes || []).map((sizeValue) => {
                                  const sizeFromAttribute = getSizeAttribute()?.values.find(
                                    (v) => v.value === sizeValue
                                  );
                                  const savedLabel = variant.sizeLabels?.[sizeValue];
                                  const sizeLabel = sizeFromAttribute?.label || 
                                    savedLabel || 
                                    sizeValue.toUpperCase().replace(/-/g, ' ');
                                  const stockValue = (variant.sizeStocks || {})[sizeValue] !== undefined && (variant.sizeStocks || {})[sizeValue] !== null
                                    ? String((variant.sizeStocks || {})[sizeValue])
                                    : '';
                                  
                                  return (
                                    <div key={sizeValue} className="flex items-center gap-2">
                                      <label className="text-sm text-gray-700 min-w-[80px] font-medium">
                                        {sizeLabel}:
                                      </label>
                                      <Input
                                        type="number"
                                        value={stockValue}
                                        onChange={(e) => updateSizeStock(variant.id, sizeValue, e.target.value)}
                                        placeholder="0"
                                        required
                                        className="flex-1"
                                        min="0"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* Option to add to global attributes */}
                          {getSizeAttribute() && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                              <p className="text-xs text-gray-600 mb-2">
                                Or add size to global attributes (for all products):
                              </p>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={newSizeName}
                                  onChange={(e) => setNewSizeName(e.target.value)}
                                  placeholder="Enter size name"
                                  className="flex-1"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddSize();
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={handleAddSize}
                                  disabled={addingSize || !newSizeName.trim()}
                                  className="whitespace-nowrap text-xs"
                                >
                                  {addingSize ? 'Adding...' : '+ Add to Attributes'}
                                </Button>
                              </div>
                              {sizeMessage && (
                                <div className={`mt-2 text-xs px-2 py-1 rounded ${
                                  sizeMessage.type === 'success' 
                                    ? 'bg-green-50 text-green-700 border border-green-200' 
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                  {sizeMessage.text}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Validation message */}
                          {isClothingCategory() && 
                           !getSizeAttribute() && 
                           !variant.size && 
                           (variant.sizes || []).length === 0 && (
                            <p className="mt-2 text-sm text-red-600">
                              At least one size is required for this category
                            </p>
                          )}
                          {isClothingCategory() && 
                           getSizeAttribute() && 
                           (variant.sizes || []).length === 0 && (
                            <p className="mt-2 text-sm text-red-600">
                              At least one size is required for this category
                            </p>
                          )}
                        </div>

                        {/* Variant Image URL */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Variant Image URL (optional)
                          </label>
                          <Input
                            type="url"
                            value={variant.imageUrl}
                            onChange={(e) => updateVariant(variant.id, 'imageUrl', e.target.value)}
                            placeholder="https://example.com/variant-image.jpg"
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Publishing */}
            <div>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => setFormData((prev) => ({ ...prev, published: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Publish immediately</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData((prev) => ({ ...prev, featured: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <span aria-hidden="true">⭐</span>
                    Mark as Featured (for homepage tab)
                  </span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Product' : 'Create Product')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push('/admin')}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function AddProductPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AddProductPageContent />
    </Suspense>
  );
}

