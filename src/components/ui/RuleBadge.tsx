import React, { useEffect, useState } from "react";
import { FastTooltip } from "./FastTooltip";
import { getMessageFilterRulesApi } from "../../api/messageFilterApi/messageFilterApi";
import { getVendorTransformRulesApi } from "../../api/routeManagerApi/vendorTransformApi";

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
  size: _size,
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
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 dark:bg-primary/20 dark:text-purple-300 dark:border-primary/40 transition-colors cursor-pointer ${className}`}
        title={tooltipContent}
      >
        <span>{displayText}</span>
      </button>
    </FastTooltip>
  );
};

export default RuleBadge;
