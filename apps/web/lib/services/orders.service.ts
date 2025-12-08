import { db } from "@white-shop/db";

function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 10000)).padStart(5, "0");
  return `${year}${month}${day}-${random}`;
}

class OrdersService {
  /**
   * Create order (checkout)
   */
  async checkout(data: any, userId?: string) {
    try {
      const {
        cartId,
        items: guestItems,
        email,
        phone,
        shippingMethod = 'pickup',
        shippingAddress,
        paymentMethod = 'idram',
      } = data;

      // Validate required fields
      if (!email || !phone) {
        throw {
          status: 400,
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          detail: "Email and phone are required",
        };
      }

      // Get cart items - either from user cart or guest items
      let cartItems: Array<{
        variantId: string;
        productId: string;
        quantity: number;
        price: number;
        productTitle: string;
        variantTitle?: string;
        sku: string;
        imageUrl?: string;
      }> = [];

      if (userId && cartId && cartId !== 'guest-cart') {
        // Get items from user's cart
        const cart = await db.cart.findFirst({
          where: { id: cartId, userId },
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
                    options: true,
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

        if (!cart || cart.items.length === 0) {
          throw {
            status: 400,
            type: "https://api.shop.am/problems/validation-error",
            title: "Cart is empty",
            detail: "Cannot checkout with an empty cart",
          };
        }

        // Format cart items
        cartItems = await Promise.all(
          cart.items.map(async (item: {
            productId: string;
            variantId: string;
            quantity: number;
            priceSnapshot: number;
            product: any;
            variant: any;
          }) => {
            const product = item.product;
            const variant = item.variant;
            const translation = product.translations?.[0] || product.translations?.[0];

            // Get variant title from options
            const variantTitle = variant.options
              ?.map((opt: any) => `${opt.attributeKey}: ${opt.value}`)
              .join(', ') || undefined;

            // Get image URL
            let imageUrl: string | undefined;
            if (product.media && Array.isArray(product.media) && product.media.length > 0) {
              const firstMedia = product.media[0];
              if (typeof firstMedia === "string") {
                imageUrl = firstMedia;
              } else if ((firstMedia as any)?.url) {
                imageUrl = (firstMedia as any).url;
              } else if ((firstMedia as any)?.src) {
                imageUrl = (firstMedia as any).src;
              }
            }

            // Check stock availability
            if (variant.stock < item.quantity) {
              throw {
                status: 422,
                type: "https://api.shop.am/problems/validation-error",
                title: "Insufficient stock",
                detail: `Product "${translation?.title || 'Unknown'}" - insufficient stock. Available: ${variant.stock}, Requested: ${item.quantity}`,
              };
            }

            return {
              variantId: variant.id,
              productId: product.id,
              quantity: item.quantity,
              price: Number(item.priceSnapshot),
              productTitle: translation?.title || 'Unknown Product',
              variantTitle,
              sku: variant.sku || '',
              imageUrl,
            };
          })
        );
      } else if (guestItems && Array.isArray(guestItems) && guestItems.length > 0) {
        // Get items from guest checkout
        cartItems = await Promise.all(
          guestItems.map(async (item: any) => {
            const { productId, variantId, quantity } = item;

            if (!productId || !variantId || !quantity) {
              throw {
                status: 400,
                type: "https://api.shop.am/problems/validation-error",
                title: "Validation Error",
                detail: "Each item must have productId, variantId, and quantity",
              };
            }

            // Get product and variant details
            const variant = await db.productVariant.findUnique({
              where: { id: variantId },
              include: {
                product: {
                  include: {
                    translations: true,
                  },
                },
                options: true,
              },
            });

            if (!variant || variant.productId !== productId) {
              throw {
                status: 404,
                type: "https://api.shop.am/problems/not-found",
                title: "Product variant not found",
                detail: `Variant ${variantId} not found for product ${productId}`,
              };
            }

            // Check stock
            if (variant.stock < quantity) {
              throw {
                status: 422,
                type: "https://api.shop.am/problems/validation-error",
                title: "Insufficient stock",
                detail: `Insufficient stock. Available: ${variant.stock}, Requested: ${quantity}`,
              };
            }

            const translation = variant.product.translations?.[0] || variant.product.translations?.[0];
            const variantTitle = variant.options
              ?.map((opt: any) => `${opt.attributeKey}: ${opt.value}`)
              .join(', ') || undefined;

            // Get image URL
            let imageUrl: string | undefined;
            if (variant.product.media && Array.isArray(variant.product.media) && variant.product.media.length > 0) {
              const firstMedia = variant.product.media[0];
              if (typeof firstMedia === "string") {
                imageUrl = firstMedia;
              } else if ((firstMedia as any)?.url) {
                imageUrl = (firstMedia as any).url;
              } else if ((firstMedia as any)?.src) {
                imageUrl = (firstMedia as any).src;
              }
            }

            return {
              variantId: variant.id,
              productId: variant.product.id,
              quantity,
              price: Number(variant.price),
              productTitle: translation?.title || 'Unknown Product',
              variantTitle,
              sku: variant.sku || '',
              imageUrl,
            };
          })
        );
      } else {
        throw {
          status: 400,
          type: "https://api.shop.am/problems/validation-error",
          title: "Cart is empty",
          detail: "Cannot checkout with an empty cart",
        };
      }

      if (cartItems.length === 0) {
        throw {
          status: 400,
          type: "https://api.shop.am/problems/validation-error",
          title: "Cart is empty",
          detail: "Cannot checkout with an empty cart",
        };
      }

      // Calculate totals
      const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountAmount = 0; // TODO: Implement discount/coupon logic
      const shippingAmount = shippingMethod === 'delivery' ? 1000 : 0; // TODO: Calculate based on address
      const taxAmount = 0; // TODO: Calculate tax if needed
      const total = subtotal - discountAmount + shippingAmount + taxAmount;

      // Generate order number
      const orderNumber = generateOrderNumber();

      // Create order with items in a transaction
      const order = await db.$transaction(async (tx: any) => {
        // Create order
        const newOrder = await tx.order.create({
          data: {
            number: orderNumber,
            userId: userId || null,
            status: 'pending',
            paymentStatus: 'pending',
            fulfillmentStatus: 'unfulfilled',
            subtotal,
            discountAmount,
            shippingAmount,
            taxAmount,
            total,
            currency: 'AMD',
            customerEmail: email,
            customerPhone: phone,
            customerLocale: 'en', // TODO: Get from request
            shippingMethod,
            shippingAddress: shippingAddress ? JSON.parse(JSON.stringify(shippingAddress)) : null,
            billingAddress: shippingAddress ? JSON.parse(JSON.stringify(shippingAddress)) : null,
            items: {
              create: cartItems.map((item) => ({
                variantId: item.variantId,
                productTitle: item.productTitle,
                variantTitle: item.variantTitle,
                sku: item.sku,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity,
                imageUrl: item.imageUrl,
              })),
            },
            events: {
              create: {
                type: 'order_created',
                data: {
                  source: userId ? 'user' : 'guest',
                  paymentMethod,
                  shippingMethod,
                },
              },
            },
          },
          include: {
            items: true,
          },
        });

        // Update stock for all variants
        for (const item of cartItems) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }

        // Create payment record
        const payment = await tx.payment.create({
          data: {
            orderId: newOrder.id,
            provider: paymentMethod,
            method: paymentMethod,
            amount: total,
            currency: 'AMD',
            status: 'pending',
          },
        });

        // If user cart, delete cart after successful checkout
        if (userId && cartId && cartId !== 'guest-cart') {
          await tx.cart.delete({
            where: { id: cartId },
          });
        }

        return { order: newOrder, payment };
      });

      // Return order and payment info
      return {
        order: {
          id: order.order.id,
          number: order.order.number,
          status: order.order.status,
          paymentStatus: order.order.paymentStatus,
          total: order.order.total,
          currency: order.order.currency,
        },
        payment: {
          provider: order.payment.provider,
          paymentUrl: null, // TODO: Generate payment URL for Idram/ArCa
          expiresAt: null, // TODO: Set expiration if needed
        },
        nextAction: paymentMethod === 'idram' || paymentMethod === 'arca' 
          ? 'redirect_to_payment' 
          : 'view_order',
      };
    } catch (error: any) {
      // If it's already our custom error, re-throw it
      if (error.status && error.type) {
        throw error;
      }

      // Log unexpected errors
      console.error("❌ [ORDERS SERVICE] Checkout error:", {
        error: {
          name: error?.name,
          message: error?.message,
          code: error?.code,
          meta: error?.meta,
          stack: error?.stack?.substring(0, 500),
        },
      });

      // Handle Prisma errors
      if (error?.code === 'P2002') {
        throw {
          status: 409,
          type: "https://api.shop.am/problems/conflict",
          title: "Conflict",
          detail: "Order number already exists, please try again",
        };
      }

      // Generic error
      throw {
        status: 500,
        type: "https://api.shop.am/problems/internal-error",
        title: "Internal Server Error",
        detail: error?.message || "An error occurred during checkout",
      };
    }
  }

  /**
   * Get user orders list
   */
  async list(userId: string) {
    const orders = await db.order.findMany({
      where: { userId },
      include: {
        items: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      data: orders.map((order: {
        id: string;
        number: string;
        status: string;
        paymentStatus: string;
        fulfillmentStatus: string;
        total: number;
        currency: string;
        createdAt: Date;
        items: Array<{ id: string }>;
      }) => ({
        id: order.id,
        number: order.number,
        status: order.status,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        total: order.total,
        currency: order.currency,
        createdAt: order.createdAt,
        itemsCount: order.items.length,
      })),
    };
  }

  /**
   * Get order by number
   */
  async findByNumber(orderNumber: string, userId: string) {
    const order = await db.order.findFirst({
      where: {
        number: orderNumber,
        userId,
      },
      include: {
        items: true,
        payments: true,
        events: true,
      },
    });

    if (!order) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Order not found",
        detail: `Order with number '${orderNumber}' not found`,
      };
    }

    // Parse shipping address if it's a JSON string
    let shippingAddress = order.shippingAddress;
    if (typeof shippingAddress === 'string') {
      try {
        shippingAddress = JSON.parse(shippingAddress);
      } catch {
        shippingAddress = null;
      }
    }

    return {
      id: order.id,
      number: order.number,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      items: order.items.map((item: {
        variantId: string | null;
        productTitle: string;
        variantTitle: string | null;
        sku: string;
        quantity: number;
        price: number;
        total: number;
        imageUrl: string | null;
      }) => ({
        variantId: item.variantId || '',
        productTitle: item.productTitle,
        variantTitle: item.variantTitle || '',
        sku: item.sku,
        quantity: item.quantity,
        price: Number(item.price),
        total: Number(item.total),
        imageUrl: item.imageUrl || undefined,
      })),
      totals: {
        subtotal: Number(order.subtotal),
        discount: Number(order.discountAmount),
        shipping: Number(order.shippingAmount),
        tax: Number(order.taxAmount),
        total: Number(order.total),
        currency: order.currency,
      },
      customer: {
        email: order.customerEmail || undefined,
        phone: order.customerPhone || undefined,
      },
      shippingAddress: shippingAddress,
      shippingMethod: order.shippingMethod || 'pickup',
      trackingNumber: order.trackingNumber || undefined,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}

export const ordersService = new OrdersService();

