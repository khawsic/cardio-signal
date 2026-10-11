import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ExpandableDetailsProps {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const ExpandableDetails: React.FC<ExpandableDetailsProps> = ({
  title,
  summary,
  defaultOpen = false,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/70 hover:bg-slate-100/60 transition-colors text-left"
      >
        <div>
          <span className="text-sm font-semibold text-[#0A192F]">{title}</span>
          {summary && <span className="ml-2 text-xs text-slate-500 font-normal">· {summary}</span>}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="p-4 border-t border-slate-100 bg-white text-sm text-slate-700">
          {children}
        </div>
      )}
    </div>
  );
};
