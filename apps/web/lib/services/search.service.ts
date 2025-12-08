/**
 * Search Service
 * 
 * Service for Meilisearch integration
 * Handles product indexing and search operations
 */

import { MeiliSearch } from 'meilisearch';

// Initialize Meilisearch client
const searchClient = new MeiliSearch({
  host: process.env.MEILI_HOST || process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILI_MASTER_KEY || process.env.MEILISEARCH_API_KEY,
});

const INDEX_NAME = 'products';

/**
 * Get or create products index
 */
async function getIndex() {
  try {
    const index = await searchClient.getIndex(INDEX_NAME);
    return index;
  } catch (error: any) {
    if (error.code === 'index_not_found') {
      // Create index if it doesn't exist
      const task = await searchClient.createIndex(INDEX_NAME, { primaryKey: 'id' });
      // Wait for the task to complete and return the index
      await searchClient.waitForTask(task.taskUid);
      return await searchClient.getIndex(INDEX_NAME);
    }
    throw error;
  }
}

/**
 * Index a single product
 */
export async function indexProduct(product: any) {
  try {
    const index = await getIndex();
    
    // Transform product for Meilisearch
    const searchableProduct = {
      id: product.id,
      title: product.translations?.map((t: any) => t.title).join(' ') || '',
      subtitle: product.translations?.map((t: any) => t.subtitle).join(' ') || '',
      description: product.translations?.map((t: any) => t.descriptionHtml).join(' ') || '',
      sku: product.variants?.map((v: any) => v.sku).filter(Boolean).join(' ') || '',
      brand: product.brand?.translations?.map((t: any) => t.name).join(' ') || '',
      categoryIds: product.categoryIds || [],
      published: product.published,
      featured: product.featured,
      minPrice: product.variants?.length > 0 
        ? Math.min(...product.variants.map((v: any) => v.price))
        : 0,
      maxPrice: product.variants?.length > 0
        ? Math.max(...product.variants.map((v: any) => v.price))
        : 0,
    };

    await index.addDocuments([searchableProduct]);
    return true;
  } catch (error) {
    console.error('❌ [SEARCH] Error indexing product:', error);
    return false;
  }
}

/**
 * Index multiple products
 */
export async function indexProducts(products: any[]) {
  try {
    const index = await getIndex();
    
    const searchableProducts = products.map((product) => ({
      id: product.id,
      title: product.translations?.map((t: any) => t.title).join(' ') || '',
      subtitle: product.translations?.map((t: any) => t.subtitle).join(' ') || '',
      description: product.translations?.map((t: any) => t.descriptionHtml).join(' ') || '',
      sku: product.variants?.map((v: any) => v.sku).filter(Boolean).join(' ') || '',
      brand: product.brand?.translations?.map((t: any) => t.name).join(' ') || '',
      categoryIds: product.categoryIds || [],
      published: product.published,
      featured: product.featured,
      minPrice: product.variants?.length > 0 
        ? Math.min(...product.variants.map((v: any) => v.price))
        : 0,
      maxPrice: product.variants?.length > 0
        ? Math.max(...product.variants.map((v: any) => v.price))
        : 0,
    }));

    await index.addDocuments(searchableProducts);
    return true;
  } catch (error) {
    console.error('❌ [SEARCH] Error indexing products:', error);
    return false;
  }
}

/**
 * Delete product from index
 */
export async function deleteProduct(productId: string) {
  try {
    const index = await getIndex();
    await index.deleteDocument(productId);
    return true;
  } catch (error) {
    console.error('❌ [SEARCH] Error deleting product from index:', error);
    return false;
  }
}

/**
 * Search products
 */
export async function searchProducts(query: string, options?: {
  limit?: number;
  offset?: number;
  filter?: string;
  sort?: string[];
}) {
  try {
    const index = await getIndex();
    
    const searchOptions: any = {
      limit: options?.limit || 20,
      offset: options?.offset || 0,
    };

    if (options?.filter) {
      searchOptions.filter = options.filter;
    }

    if (options?.sort && options.sort.length > 0) {
      searchOptions.sort = options.sort;
    }

    const results = await index.search(query, searchOptions);
    return results;
  } catch (error) {
    console.error('❌ [SEARCH] Error searching products:', error);
    throw error;
  }
}

/**
 * Update index settings
 */
export async function updateIndexSettings(settings: {
  searchableAttributes?: string[];
  filterableAttributes?: string[];
  sortableAttributes?: string[];
}) {
  try {
    const index = await getIndex();
    
    if (settings.searchableAttributes) {
      await index.updateSearchableAttributes(settings.searchableAttributes);
    }
    
    if (settings.filterableAttributes) {
      await index.updateFilterableAttributes(settings.filterableAttributes);
    }
    
    if (settings.sortableAttributes) {
      await index.updateSortableAttributes(settings.sortableAttributes);
    }
    
    return true;
  } catch (error) {
    console.error('❌ [SEARCH] Error updating index settings:', error);
    return false;
  }
}

/**
 * Clear all documents from index
 */
export async function clearIndex() {
  try {
    const index = await getIndex();
    await index.deleteAllDocuments();
    return true;
  } catch (error) {
    console.error('❌ [SEARCH] Error clearing index:', error);
    return false;
  }
}

export const searchService = {
  indexProduct,
  indexProducts,
  deleteProduct,
  searchProducts,
  updateIndexSettings,
  clearIndex,
};

