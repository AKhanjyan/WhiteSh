'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Home, Filter, UserRound, ShoppingCart, Store } from 'lucide-react';
import { getCompareCount, getWishlistCount } from '../lib/storageCounts';
import { MOBILE_FILTERS_EVENT } from '../lib/events';

interface MobileNavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  action?: () => void;
  onClick?: () => void;
  badge?: 'wishlist' | 'compare';
  visible?: boolean;
}

/**
 * Ստեղծում է հաստատուն mobile նավիգացիոն վահանակ՝ էջի ներքևում,
 * որպեսզի հիմնական գործողությունները միշտ լինեն ձեռքի տակ փոքր էկրաններում։
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const isProductsPage = pathname?.startsWith('/products');
  const [wishlistCount, setWishlistCount] = useState(0);
  const [compareCount, setCompareCount] = useState(0);

  useEffect(() => {
    const updateCounts = () => {
      const wishlist = getWishlistCount();
      const compare = getCompareCount();
      console.debug('[MobileBottomNav] wishlist/compare counts refreshed', { wishlist, compare });
      setWishlistCount(wishlist);
      setCompareCount(compare);
    };

    updateCounts();
    window.addEventListener('wishlist-updated', updateCounts);
    window.addEventListener('compare-updated', updateCounts);

    return () => {
      window.removeEventListener('wishlist-updated', updateCounts);
      window.removeEventListener('compare-updated', updateCounts);
    };
  }, []);

  const navItems: MobileNavItem[] = useMemo(
    () => [
      { 
        label: 'Home', 
        href: '/', 
        icon: Home, 
        visible: true,
      },
      { 
        label: 'Filters', 
        icon: Filter, 
        visible: isProductsPage,
        action: () => {
          console.debug('[MobileBottomNav] dispatching filters event');
          window.dispatchEvent(new Event(MOBILE_FILTERS_EVENT));
        },
      },
      // Shop with Store icon
      { 
        label: 'Shop', 
        href: '/products', 
        icon: Store, 
        visible: true,
        onClick: () => console.info('🛒 [MobileBottomNav] Shop tapped, navigating to /products'),
      },
      { label: 'My account', href: '/profile', icon: UserRound, visible: true },
      // On mobile we show Cart instead of Wishlist
      { 
        label: 'Cart', 
        href: '/cart', 
        icon: ShoppingCart, 
        visible: true,
      },
    ],
    [isProductsPage]
  );

  const resolveBadgeValue = (badge?: MobileNavItem['badge']) => {
    if (badge === 'wishlist') return wishlistCount;
    if (badge === 'compare') return compareCount;
    return 0;
  };

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(15,23,42,0.08)]">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 py-2">
        {navItems.filter(item => item.visible).map(({ label, href, icon: Icon, badge, action, onClick }) => {
          const isActive = href ? pathname === href : false;
          const badgeValue = resolveBadgeValue(badge);

          const content = (
            <>
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? 'text-gray-900' : 'text-gray-500'}`} />
                {badgeValue > 0 && (
                  <span className="absolute -top-2 -right-2 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                    {badgeValue > 99 ? '99+' : badgeValue}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[11px]">{label}</span>
            </>
          );

          if (action) {
            return (
              <button
                key={label}
                type="button"
                onClick={action}
                className="flex flex-1 flex-col items-center rounded-xl px-2 py-1 text-xs font-medium text-gray-500 transition"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={label}
              href={href || '#'}
              onClick={onClick}
              className={`flex flex-1 flex-col items-center rounded-xl px-2 py-1 text-xs font-medium transition ${
                isActive ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

