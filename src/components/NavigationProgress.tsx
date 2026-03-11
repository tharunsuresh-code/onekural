"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export const NAV_START_EVENT = "onekural:nav-start";

export function emitNavStart() {
  window.dispatchEvent(new CustomEvent(NAV_START_EVENT));
}

export default function NavigationProgress() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    const onStart = () => {
      pendingRef.current = true;
      setPending(true);
    };
    window.addEventListener(NAV_START_EVENT, onStart);
    return () => window.removeEventListener(NAV_START_EVENT, onStart);
  }, []);

  // Complete when pathname changes
  useEffect(() => {
    if (pendingRef.current) {
      pendingRef.current = false;
      setPending(false);
    }
  }, [pathname]);

  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          key="nav-progress"
          className="fixed top-0 left-0 right-0 z-[100] h-[2px] origin-left"
          style={{ background: "var(--accent)" }}
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 0.83, opacity: 1 }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={{
            scaleX: { duration: 1.2, ease: [0.4, 0, 0.2, 1] },
            opacity: { duration: 0.3, delay: 0.1 },
          }}
        />
      )}
    </AnimatePresence>
  );
}
