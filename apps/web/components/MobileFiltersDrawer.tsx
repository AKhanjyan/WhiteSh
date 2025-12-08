'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface MobileFiltersDrawerProps {
  title?: string;
  triggerLabel?: string;
  children: ReactNode;
  openEventName?: string;
}

/**
 * Mobile filters drawer that կարող է բացվել թե՛ կոճակից, թե՛ արտաքին իրադարձությունից։
 */
export function MobileFiltersDrawer({
  title = 'Filters',
  triggerLabel = 'Filters',
  children,
  openEventName,
}: MobileFiltersDrawerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!openEventName) return;

    const handleExternalToggle = () => {
      console.debug('[MobileFiltersDrawer] external toggle received');
      setOpen((prev) => !prev);
    };

    window.addEventListener(openEventName, handleExternalToggle);
    return () => {
      window.removeEventListener(openEventName, handleExternalToggle);
    };
  }, [openEventName]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-800 shadow-sm"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6H20M4 12H16M4 18H12" />
        </svg>
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="h-full min-h-screen w-1/2 min-w-[16rem] max-w-full bg-white flex flex-col shadow-2xl"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <p className="text-lg font-semibold text-gray-900">{title}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 w-10 rounded-full border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
                aria-label="Close filters"
              >
                <svg className="mx-auto h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}

