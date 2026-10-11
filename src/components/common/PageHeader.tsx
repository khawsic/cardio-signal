import React from 'react';

interface PageHeaderProps {
  title: string;
  supportingText: string;
  kicker?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  supportingText,
  kicker,
  actions,
}) => {
  return (
    <div className="border-b border-slate-100 bg-white pt-8 pb-7">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-3xl">
            {kicker && (
              <div className="text-xs font-semibold tracking-wide uppercase text-cyan-700 mb-2">
                {kicker}
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#0A192F]">
              {title}
            </h1>
            <p className="mt-2 text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
              {supportingText}
            </p>
          </div>
          {actions && <div className="shrink-0 flex items-center gap-3">{actions}</div>}
        </div>
      </div>
    </div>
  );
};
