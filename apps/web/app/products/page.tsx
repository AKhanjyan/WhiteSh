import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@shop/ui';
import { apiClient } from '../../lib/api-client';
import { getStoredLanguage } from '../../lib/language';
import { PriceFilter } from '../../components/PriceFilter';
import { ColorFilter } from '../../components/ColorFilter';
import { SizeFilter } from '../../components/SizeFilter';
import { BrandFilter } from '../../components/BrandFilter';
import { ProductsHeader } from '../../components/ProductsHeader';
import { ProductsGrid } from '../../components/ProductsGrid';
import { CategoryNavigation } from '../../components/CategoryNavigation';
import { MobileFiltersDrawer } from '../../components/MobileFiltersDrawer';
import { MOBILE_FILTERS_EVENT } from '../../lib/events';

const PAGE_CONTAINER = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';

interface Product {
  id: string;
  slug: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  inStock: boolean;
  brand: {
    id: string;
    name: string;
  } | null;
}

interface ProductsResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Մատչելի API-ից բերում է ապրանքների ցանկը՝ կիրառելով բոլոր ֆիլտրերը։
 */
async function getProducts(
  page: number = 1,
  search?: string,
  category?: string,
  minPrice?: string,
  maxPrice?: string,
  colors?: string,
  sizes?: string,
  brand?: string
): Promise<ProductsResponse> {
  try {
    const language = getStoredLanguage();
    const params: Record<string, string> = {
      page: page.toString(),
      limit: '24',
      lang: language,
    };
    
    if (search && search.trim()) {
      params.search = search.trim();
    }
    
    if (category && category.trim()) {
      params.category = category.trim();
    }
    
    if (minPrice && minPrice.trim()) {
      params.minPrice = minPrice.trim();
    }
    
    if (maxPrice && maxPrice.trim()) {
      params.maxPrice = maxPrice.trim();
    }

    if (colors && colors.trim()) {
      params.colors = colors.trim();
    }

    if (sizes && sizes.trim()) {
      params.sizes = sizes.trim();
    }

    if (brand && brand.trim()) {
      params.brand = brand.trim();
    }
    
    const response = await apiClient.get<ProductsResponse>('/api/v1/products', {
      params,
    });
    
    // Ensure response has required structure
    if (!response) {
      console.warn('⚠️ [PRODUCTS] Response is null or undefined');
      return {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 24,
          totalPages: 0,
        },
      };
    }
    
    // Ensure response has data and meta
    if (!response.data || !Array.isArray(response.data)) {
      console.warn('⚠️ [PRODUCTS] Response.data is missing or not an array');
      return {
        data: [],
        meta: response.meta || {
          total: 0,
          page: 1,
          limit: 24,
          totalPages: 0,
        },
      };
    }
    
    return response;
  } catch (error: any) {
    console.error('❌ [PRODUCTS] Error fetching products:', error);
    console.error('❌ [PRODUCTS] Error details:', {
      message: error?.message,
      stack: error?.stack,
      status: error?.status,
    });
    return {
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 24,
        totalPages: 0,
      },
    };
  }
}


/**
 * Ցուցադրում է ապրանքների գլխավոր էջը՝ ֆիլտրերով և գրաֆիկով։
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; search?: string; category?: string; minPrice?: string; maxPrice?: string; colors?: string; sizes?: string; brand?: string; sort?: string }>;
}) {
  // In Next.js 15, searchParams is always a Promise
  const resolvedSearchParams = searchParams ? await searchParams : {};
  
  const page = parseInt(resolvedSearchParams?.page || '1', 10);
  const search = resolvedSearchParams?.search;
  const category = resolvedSearchParams?.category;
  const minPrice = resolvedSearchParams?.minPrice;
  const maxPrice = resolvedSearchParams?.maxPrice;
  const colors = resolvedSearchParams?.colors;
  const sizes = resolvedSearchParams?.sizes;
  const brand = resolvedSearchParams?.brand;
  const sort = resolvedSearchParams?.sort;
  const productsData = await getProducts(page, search, category, minPrice, maxPrice, colors, sizes, brand);
  
  // Parse selected colors and sizes
  // Normalize colors to lowercase to match service response (case-insensitive matching)
  const selectedColors = colors ? colors.split(',').map(c => c.trim().toLowerCase()) : [];
  const selectedSizes = sizes ? sizes.split(',').map(s => s.trim()) : [];

  // Helper function to build pagination URL
  const buildPaginationUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set('page', pageNum.toString());
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (colors) params.set('colors', colors);
    if (sizes) params.set('sizes', sizes);
    if (brand) params.set('brand', brand);
    if (sort) params.set('sort', sort);
    return `/products?${params.toString()}`;
  };

  return (
    <div className="w-full">
      <div className={PAGE_CONTAINER}>
        {/* Category Navigation */}
        <CategoryNavigation />
        
        {/* Header with Breadcrumb, View Mode, and Sort */}
        <ProductsHeader />
      </div>

      <div className={`${PAGE_CONTAINER} flex gap-8`}>
        {/* Left Sidebar - Filters (aligned with logo direction) */}
        <aside className="w-64 flex-shrink-0 hidden lg:block bg-gray-50 min-h-screen rounded-xl">
          <div className="sticky top-4 p-4 space-y-6">
            <Suspense fallback={<div className="text-sm text-gray-500">Loading filters...</div>}>
              <PriceFilter currentMinPrice={minPrice} currentMaxPrice={maxPrice} category={category} search={search} />
              <ColorFilter 
                category={category} 
                search={search} 
                minPrice={minPrice} 
                maxPrice={maxPrice}
                selectedColors={selectedColors}
              />
              <SizeFilter 
                category={category} 
                search={search} 
                minPrice={minPrice} 
                maxPrice={maxPrice}
                selectedSizes={selectedSizes}
              />
              <BrandFilter 
                category={category} 
                search={search} 
                minPrice={minPrice} 
                maxPrice={maxPrice}
                selectedBrand={brand}
              />
            </Suspense>
          </div>
        </aside>

        {/* Main Content - Products */}
        <div className="flex-1 min-w-0 py-4">
            {/* Mobile Filter Drawer */}
            <div className="mb-6">
              <MobileFiltersDrawer triggerLabel="Filters" openEventName={MOBILE_FILTERS_EVENT}>
                <Suspense fallback={<div className="text-sm text-gray-500">Loading filters...</div>}>
                  <PriceFilter currentMinPrice={minPrice} currentMaxPrice={maxPrice} category={category} search={search} />
                  <ColorFilter 
                    category={category} 
                    search={search} 
                    minPrice={minPrice} 
                    maxPrice={maxPrice}
                    selectedColors={selectedColors}
                  />
                  <SizeFilter 
                    category={category} 
                    search={search} 
                    minPrice={minPrice} 
                    maxPrice={maxPrice}
                    selectedSizes={selectedSizes}
                  />
                  <BrandFilter 
                    category={category} 
                    search={search} 
                    minPrice={minPrice} 
                    maxPrice={maxPrice}
                    selectedBrand={brand}
                  />
                </Suspense>
              </MobileFiltersDrawer>
            </div>
      
            {productsData.data.length > 0 ? (
              <>
                <ProductsGrid products={productsData.data} sortBy={sort || 'default'} />

                {/* Pagination */}
                {productsData.meta.totalPages > 1 && (
                  <div className="mt-8 flex justify-center gap-2">
                    {page > 1 && (
                      <Link href={buildPaginationUrl(page - 1)}>
                        <Button variant="outline">Previous</Button>
                      </Link>
                    )}
                    <span className="flex items-center px-4">
                      Page {page} of {productsData.meta.totalPages}
                    </span>
                    {page < productsData.meta.totalPages && (
                      <Link href={buildPaginationUrl(page + 1)}>
                        <Button variant="outline">Next</Button>
                      </Link>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <p className="text-gray-500 text-lg font-medium mb-3">
                    No products found
                  </p>
                  <div className="text-gray-400 text-sm space-y-1">
                    {search && (
                      <p>Search query: "{search}"</p>
                    )}
                    {selectedColors.length > 0 && (
                      <p>Colors: {selectedColors.join(', ')}</p>
                    )}
                    {selectedSizes.length > 0 && (
                      <p>Sizes: {selectedSizes.join(', ')}</p>
                    )}
                    {brand && (
                      <p>Brand: {brand}</p>
                    )}
                    {(minPrice || maxPrice) && (
                      <p>Price range: {minPrice || '0'} - {maxPrice || '∞'} AMD</p>
                    )}
                    {category && (
                      <p>Category: {category}</p>
                    )}
                  </div>
                  <p className="text-gray-400 mt-4 text-sm">
                    {search 
                      ? 'Try searching with different keywords or adjust your filters.'
                      : (selectedColors.length > 0 || selectedSizes.length > 0 || brand || minPrice || maxPrice)
                        ? 'Try adjusting your filters to see more results.'
                        : 'Please make sure the API server is running and the database is seeded.'}
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

