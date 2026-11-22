import React, { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { FastTooltip } from "./FastTooltip";
import { getMessageFilterRulesApi } from "../../api/authorizationApi/messageFilterApi";
import { getVendorTransformRulesApi } from "../../api/authorizationApi/vendorTransformApi";

interface RuleMeta {
  name: string;
  clientId?: number | null;
}

// In-memory cache for rule metadata across modal sessions
const ruleMetaCache: Record<string, RuleMeta> = {};
let filterRulesPromise: Promise<void> | null = null;
let vendorRulesPromise: Promise<void> | null = null;

const ensureFilterRulesLoaded = async () => {
  if (filterRulesPromise) return filterRulesPromise;
  filterRulesPromise = (async () => {
    try {
      const res = await getMessageFilterRulesApi({ page_size: 1000 });
      const list = Array.isArray(res) ? res : res?.results || [];
      list.forEach((r: any) => {
        if (r.id && r.name) {
          const meta: RuleMeta = { name: r.name, clientId: r.client };
          if (r.targetEntity === "DESTINATION") {
            ruleMetaCache[`dest_${r.id}`] = meta;
          } else if (r.targetEntity === "MESSAGE_TEXT") {
            ruleMetaCache[`text_${r.id}`] = meta;
          }
          ruleMetaCache[`filter_${r.id}`] = meta;
        }
      });
    } catch (err) {
      console.warn("Could not load message filter rules for tooltips", err);
    }
  })();
  return filterRulesPromise;
};

const ensureVendorRulesLoaded = async () => {
  if (vendorRulesPromise) return vendorRulesPromise;
  vendorRulesPromise = (async () => {
    try {
      const res = await getVendorTransformRulesApi({ page_size: 1000 } as any);
      const list = Array.isArray(res) ? res : res?.results || [];
      list.forEach((r: any) => {
        if (r.id && r.name) {
          ruleMetaCache[`vendor_${r.id}`] = { name: r.name, clientId: r.client };
        }
      });
    } catch (err) {
      console.warn("Could not load vendor transform rules for tooltips", err);
    }
  })();
  return vendorRulesPromise;
};

export type RuleType = "destination" | "text" | "sender" | "vendor";

interface RuleBadgeProps {
  id: string | number;
  type: RuleType;
  labelPrefix?: string;
  size?: "sm" | "xs";
  className?: string;
  clientId?: number | null;
}

export const RuleBadge: React.FC<RuleBadgeProps> = ({
  id,
  type,
  labelPrefix,
  size = "sm",
  className = "",
  clientId,
}) => {
  const cleanId = String(id).replace(/^#/, "").trim();
  const cacheKey =
    type === "destination"
      ? `dest_${cleanId}`
      : type === "text"
      ? `text_${cleanId}`
      : type === "vendor"
      ? `vendor_${cleanId}`
      : `sender_${cleanId}`;

  const [ruleMeta, setRuleMeta] = useState<RuleMeta | null>(
    ruleMetaCache[cacheKey] || null
  );

  useEffect(() => {
    let mounted = true;
    if (ruleMetaCache[cacheKey]) {
      setRuleMeta(ruleMetaCache[cacheKey]);
      return;
    }

    if (type === "destination" || type === "text") {
      ensureFilterRulesLoaded().then(() => {
        if (mounted && ruleMetaCache[cacheKey]) {
          setRuleMeta(ruleMetaCache[cacheKey]);
        }
      });
    } else if (type === "vendor") {
      ensureVendorRulesLoaded().then(() => {
        if (mounted && ruleMetaCache[cacheKey]) {
          setRuleMeta(ruleMetaCache[cacheKey]);
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, [cacheKey, type]);

  const defaultPrefix =
    type === "destination"
      ? "Destination Rule"
      : type === "text"
      ? "Text Rule"
      : type === "sender"
      ? "Sender Rule"
      : "Vendor Rule";

  const displayPrefix = labelPrefix ?? defaultPrefix;
  const displayText = displayPrefix ? `${displayPrefix} #${cleanId}` : `#${cleanId}`;

  const tooltipContent = ruleMeta?.name
    ? `Rule #${cleanId}: "${ruleMeta.name}" • Click to open rule`
    : `${displayPrefix || "Rule"} #${cleanId} • Click to open in management`;

  const colorClasses =
    type === "destination"
      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-100/60 dark:hover:bg-blue-900/50"
      : type === "text"
      ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-100/60 dark:hover:bg-amber-900/50"
      : type === "sender"
      ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-100/60 dark:hover:bg-purple-900/50"
      : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/50";

  const sizeClasses =
    size === "xs"
      ? "px-1.5 py-0.5 text-[10px]"
      : "px-2 py-0.5 text-[11px]";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const effectiveClientId =
      clientId ??
      ruleMeta?.clientId ??
      ruleMetaCache[cacheKey]?.clientId;

    const cQuery = effectiveClientId ? `&clientId=${effectiveClientId}` : "";
    const rQuery = cleanId ? `&ruleId=${cleanId}` : "";

    const url =
      type === "destination"
        ? `/messageFilter?tab=destinationRules${cQuery}${rQuery}`
        : type === "text"
        ? `/messageFilter?tab=messageTextRules${cQuery}${rQuery}`
        : type === "sender"
        ? `/senderIdManagement?tab=translation${cQuery}${rQuery}`
        : `/routeManager/vendorTransform?tab=rules${cQuery}${rQuery}`;

    window.open(url, "_blank");
  };

  return (
    <FastTooltip text={tooltipContent} delay={200} className="inline-flex">
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1 rounded font-medium border transition-all cursor-pointer group shadow-2xs ${colorClasses} ${sizeClasses} ${className}`}
        title={tooltipContent}
      >
        <span>{displayText}</span>
        <ExternalLink
          size={size === "xs" ? 10 : 11}
          className="opacity-40 group-hover:opacity-100 transition-opacity"
        />
      </button>
    </FastTooltip>
  );
};

export default RuleBadge;
