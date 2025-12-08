import { db } from "@white-shop/db";

class CartService {
  /**
   * Get or create user's cart
   */
  async getCart(userId: string, locale: string = "en") {
    // Get discount settings
    const discountSettings = await db.settings.findMany({
      where: {
        key: {
          in: ["globalDiscount", "categoryDiscounts", "brandDiscounts"],
        },
      },
    });

    const globalDiscount =
      Number(
        discountSettings.find((s: { key: string; value: unknown }) => s.key === "globalDiscount")?.value
      ) || 0;
    
    const categoryDiscountsSetting = discountSettings.find((s: { key: string; value: unknown }) => s.key === "categoryDiscounts");
    const categoryDiscounts = categoryDiscountsSetting ? (categoryDiscountsSetting.value as Record<string, number>) || {} : {};
    
    const brandDiscountsSetting = discountSettings.find((s: { key: string; value: unknown }) => s.key === "brandDiscounts");
    const brandDiscounts = brandDiscountsSetting ? (brandDiscountsSetting.value as Record<string, number>) || {} : {};
    let cart = await db.cart.findFirst({
      where: {
        userId,
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    translations: true,
                  },
                },
              },
            },
            product: {
              include: {
                translations: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await db.cart.create({
        data: {
          userId,
          locale,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          items: {
            create: [],
          },
        },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      translations: true,
                    },
                  },
                },
              },
              product: {
                include: {
                  translations: true,
                },
              },
            },
          },
        },
      });
    }

    // Format items with details
    const itemsWithDetails = await Promise.all(
      cart.items.map(async (item: {
        id: string;
        productId: string;
        variantId: string;
        quantity: number;
      }) => {
        const product = await db.product.findUnique({
          where: { id: item.productId },
          include: {
            translations: true,
            variants: {
              where: { id: item.variantId },
            },
          },
        });

        const variant = product?.variants[0];
        const translation =
          product?.translations.find((t: { locale: string }) => t.locale === locale) ||
          product?.translations[0];

        let imageUrl = null;
        if (product?.media && Array.isArray(product.media) && product.media.length > 0) {
          const firstMedia = product.media[0];
          if (typeof firstMedia === "string") {
            imageUrl = firstMedia;
          } else if ((firstMedia as any)?.url) {
            imageUrl = (firstMedia as any).url;
          } else if ((firstMedia as any)?.src) {
            imageUrl = (firstMedia as any).src;
          }
        }

        // Calculate discount and original price
        // Always use the latest discount from the product, not the stored priceSnapshot
        const productDiscount = product?.discountPercent || 0;
        let appliedDiscount = 0;
        if (productDiscount > 0) {
          appliedDiscount = productDiscount;
        } else {
          // Check category discounts
          const primaryCategoryId = product?.primaryCategoryId;
          if (primaryCategoryId && categoryDiscounts[primaryCategoryId]) {
            appliedDiscount = categoryDiscounts[primaryCategoryId];
          } else {
            // Check brand discounts
            const brandId = product?.brandId;
            if (brandId && brandDiscounts[brandId]) {
              appliedDiscount = brandDiscounts[brandId];
            } else if (globalDiscount > 0) {
              appliedDiscount = globalDiscount;
            }
          }
        }

        // Always calculate the latest price from variant.price with current discount
        // This ensures that if product discount is updated, cart shows the latest price
        const variantOriginalPrice = variant?.price || 0;
        let finalPrice = variantOriginalPrice;
        let originalPrice: number | null = null;

        if (appliedDiscount > 0 && variantOriginalPrice > 0) {
          // Calculate discounted price with latest discount
          finalPrice = variantOriginalPrice * (1 - appliedDiscount / 100);
          originalPrice = variantOriginalPrice;
        } else if (variant?.compareAtPrice && variant.compareAtPrice > variantOriginalPrice) {
          originalPrice = Number(variant.compareAtPrice);
        }

        return {
          id: item.id,
          variant: {
            id: variant?.id || item.variantId,
            sku: variant?.sku || "",
            stock: variant?.stock || 0,
            product: {
              id: product?.id || "",
              title: translation?.title || "",
              slug: translation?.slug || "",
              image: imageUrl,
            },
          },
          quantity: item.quantity,
          price: finalPrice,
          originalPrice: originalPrice,
          total: finalPrice * item.quantity,
        };
      })
    );

    const subtotal = itemsWithDetails.reduce((sum, item) => sum + item.total, 0);

    return {
      cart: {
        id: cart.id,
        items: itemsWithDetails,
        totals: {
          subtotal,
          discount: 0,
          shipping: 0,
          tax: 0,
          total: subtotal,
          currency: "AMD",
        },
        itemsCount: itemsWithDetails.reduce((sum, item) => sum + item.quantity, 0),
      },
    };
  }

  /**
   * Add item to cart
   */
  async addItem(
    userId: string,
    data: { variantId: string; productId: string; quantity?: number },
    locale: string = "en"
  ) {
    const { variantId, productId, quantity = 1 } = data;

    if (!variantId || !productId) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/validation-error",
        title: "Validation failed",
        detail: "variantId and productId are required",
      };
    }

    // Get or create cart
    let cart = await db.cart.findFirst({
      where: { userId },
      include: { items: true },
    });

    if (!cart) {
      cart = await db.cart.create({
        data: {
          userId,
          locale,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          items: {
            create: [],
          },
        },
        include: { items: true },
      });
    }

    // Get variant
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
      },
    });

    if (!variant || !variant.published || variant.productId !== productId) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Variant not found",
      };
    }

    if (variant.stock < quantity) {
      throw {
        status: 422,
        type: "https://api.shop.am/problems/validation-error",
        title: "Insufficient stock",
        detail: `Requested quantity (${quantity}) exceeds available stock (${variant.stock})`,
      };
    }

    // Check if item already exists
    const existingItem = cart.items.find((item: { variantId: string }) => item.variantId === variantId);

    let item;
    if (existingItem) {
      item = await db.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
        },
      });
    } else {
      item = await db.cartItem.create({
        data: {
          cartId: cart.id,
          variantId,
          productId,
          quantity,
          priceSnapshot: variant.price,
        },
      });
    }

    return {
      item: {
        id: item.id,
        variantId: variantId,
        quantity: item.quantity,
        price: Number(item.priceSnapshot),
      },
    };
  }

  /**
   * Update cart item
   */
  async updateItem(userId: string, itemId: string, quantity: number) {
    if (!quantity || quantity < 1) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/validation-error",
        title: "Validation failed",
        detail: "quantity must be at least 1",
      };
    }

    const cart = await db.cart.findFirst({
      where: {
        userId,
        items: {
          some: {
            id: itemId,
          },
        },
      },
      include: {
        items: {
          where: { id: itemId },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Cart item not found",
      };
    }

    const item = cart.items[0];
    const variant = await db.productVariant.findUnique({
      where: { id: item.variantId },
    });

    if (!variant || variant.stock < quantity) {
      throw {
        status: 422,
        type: "https://api.shop.am/problems/validation-error",
        title: "Insufficient stock",
        detail: `Requested quantity (${quantity}) exceeds available stock (${variant?.stock || 0})`,
      };
    }

    const updatedItem = await db.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return {
      item: {
        id: updatedItem.id,
        quantity: updatedItem.quantity,
      },
    };
  }

  /**
   * Remove item from cart
   */
  async removeItem(userId: string, itemId: string) {
    const cart = await db.cart.findFirst({
      where: {
        userId,
        items: {
          some: {
            id: itemId,
          },
        },
      },
    });

    if (!cart) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Cart item not found",
      };
    }

    await db.cartItem.delete({
      where: { id: itemId },
    });

    return null;
  }
}

export const cartService = new CartService();

