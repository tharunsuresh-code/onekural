"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Scholar } from "@/lib/types";

interface CommentarySectionProps {
  scholars: Scholar[];
}

export default function CommentarySection({ scholars }: CommentarySectionProps) {
  const [expandedIndex, setExpandedIndex] = useState<number>(0);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-dark/70 uppercase tracking-widest mb-4">
        Commentaries
      </h2>
      {scholars.map((scholar, i) => {
        const isExpanded = expandedIndex === i;
        return (
          <div
            key={scholar.name}
            className="border border-dark/10 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setExpandedIndex(isExpanded ? -1 : i)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm font-medium text-dark/80">
                {scholar.name}
              </span>
              <motion.span
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-dark/40 text-xs"
              >
                ▼
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className="px-4 pb-4 text-sm text-dark/70 leading-relaxed">
                    {scholar.commentary}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
