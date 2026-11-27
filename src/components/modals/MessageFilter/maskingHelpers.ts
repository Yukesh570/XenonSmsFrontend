import type {
  MessageFilterRule,
  TextAction,
} from "../../../api/messageFilterApi/messageFilterApi";

export type ExtendedTextAction = TextAction | "MASK_SENSITIVE";

export type MaskDataType = "OTP_6" | "OTP_4" | "CARD_16" | "ANY_NUMBERS";
export type MaskFormat =
  | "KEEP_FIRST_2"
  | "KEEP_LAST_2"
  | "KEEP_LAST_4"
  | "ALL_ASTERISKS"
  | "REDACTED";

export interface MaskConfig {
  dataType: MaskDataType;
  format: MaskFormat;
  contextKeyword: string;
}

export function generateMaskRule(config: MaskConfig): {
  textPattern: string;
  replacement: string;
} {
  const ctx = config.contextKeyword.trim();
  const escapedCtx = ctx.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefixGroup = ctx ? `(${escapedCtx}\\s*(?:is|:)?\\s*)` : "";
  const prefixRef = ctx ? "$1" : "";
  const baseGroupNum = ctx ? 2 : 1;

  if (config.dataType === "OTP_6") {
    if (config.format === "KEEP_FIRST_2") {
      return {
        textPattern: `${prefixGroup}(\\d{2})\\d{4}`,
        replacement: `${prefixRef}$${baseGroupNum}****`,
      };
    }
    if (config.format === "KEEP_LAST_2") {
      return {
        textPattern: `${prefixGroup}\\d{4}(\\d{2})`,
        replacement: `${prefixRef}****$${baseGroupNum}`,
      };
    }
    if (config.format === "ALL_ASTERISKS") {
      return {
        textPattern: `${prefixGroup}\\d{6}`,
        replacement: `${prefixRef}******`,
      };
    }
    if (config.format === "REDACTED") {
      return {
        textPattern: `${prefixGroup}\\d{6}`,
        replacement: `${prefixRef}[REDACTED]`,
      };
    }
  }

  if (config.dataType === "OTP_4") {
    if (config.format === "KEEP_FIRST_2") {
      return {
        textPattern: `${prefixGroup}(\\d{2})\\d{2}`,
        replacement: `${prefixRef}$${baseGroupNum}**`,
      };
    }
    if (config.format === "KEEP_LAST_2") {
      return {
        textPattern: `${prefixGroup}\\d{2}(\\d{2})`,
        replacement: `${prefixRef}**$${baseGroupNum}`,
      };
    }
    if (config.format === "ALL_ASTERISKS") {
      return {
        textPattern: `${prefixGroup}\\d{4}`,
        replacement: `${prefixRef}****`,
      };
    }
    if (config.format === "REDACTED") {
      return {
        textPattern: `${prefixGroup}\\d{4}`,
        replacement: `${prefixRef}[REDACTED]`,
      };
    }
  }

  if (config.dataType === "CARD_16") {
    if (config.format === "KEEP_LAST_4") {
      return {
        textPattern: `${prefixGroup}\\d{12}(\\d{4})`,
        replacement: `${prefixRef}************$${baseGroupNum}`,
      };
    }
    if (config.format === "KEEP_FIRST_2") {
      return {
        textPattern: `${prefixGroup}(\\d{2})\\d{14}`,
        replacement: `${prefixRef}$${baseGroupNum}**************`,
      };
    }
    if (config.format === "ALL_ASTERISKS") {
      return {
        textPattern: `${prefixGroup}\\d{16}`,
        replacement: `${prefixRef}****************`,
      };
    }
    if (config.format === "REDACTED") {
      return {
        textPattern: `${prefixGroup}\\d{16}`,
        replacement: `${prefixRef}[REDACTED]`,
      };
    }
  }

  if (config.dataType === "ANY_NUMBERS") {
    if (config.format === "KEEP_FIRST_2") {
      return {
        textPattern: `${prefixGroup}(\\d{2})\\d{2,}`,
        replacement: `${prefixRef}$${baseGroupNum}****`,
      };
    }
    if (config.format === "KEEP_LAST_4") {
      return {
        textPattern: `${prefixGroup}\\d{2,}(\\d{4})`,
        replacement: `${prefixRef}****$${baseGroupNum}`,
      };
    }
    if (config.format === "REDACTED") {
      return {
        textPattern: `${prefixGroup}\\d{4,}`,
        replacement: `${prefixRef}[REDACTED]`,
      };
    }
    return {
      textPattern: `${prefixGroup}\\d{4,}`,
      replacement: `${prefixRef}****`,
    };
  }

  return {
    textPattern: `${prefixGroup}(\\d{2})\\d{4}`,
    replacement: `${prefixRef}$${baseGroupNum}****`,
  };
}

export function decodeMaskRule(rule: MessageFilterRule): {
  isMask: boolean;
  dataType?: MaskDataType;
  format?: MaskFormat;
  contextKeyword?: string;
  summary?: string;
} {
  if (rule.action !== "REGEX_REPLACE" || !rule.textPattern || !rule.replacement) {
    return { isMask: false };
  }

  const extractContext = (pattern: string) => {
    const match = pattern.match(/^\(([^)]+?)\\s\*(?:\(\?:is\|:\)\?)\\s\*\)/);
    return match ? match[1].replace(/\\/g, "") : "";
  };

  if (
    rule.textPattern.endsWith("(\\d{2})\\d{4}") &&
    (rule.replacement.endsWith("$1****") || rule.replacement.endsWith("$2****"))
  ) {
    const context = extractContext(rule.textPattern);
    return {
      isMask: true,
      dataType: "OTP_6",
      format: "KEEP_FIRST_2",
      contextKeyword: context,
      summary: `6-Digit OTP (49****)${context ? ` [after "${context}"]` : ""}`,
    };
  }

  if (
    rule.textPattern.endsWith("\\d{4}(\\d{2})") &&
    (rule.replacement.endsWith("****$1") || rule.replacement.endsWith("****$2"))
  ) {
    const context = extractContext(rule.textPattern);
    return {
      isMask: true,
      dataType: "OTP_6",
      format: "KEEP_LAST_2",
      contextKeyword: context,
      summary: `6-Digit OTP (****12)${context ? ` [after "${context}"]` : ""}`,
    };
  }

  if (rule.textPattern.endsWith("\\d{6}") && rule.replacement.endsWith("******")) {
    const context = extractContext(rule.textPattern);
    return {
      isMask: true,
      dataType: "OTP_6",
      format: "ALL_ASTERISKS",
      contextKeyword: context,
      summary: `6-Digit OTP (******)${context ? ` [after "${context}"]` : ""}`,
    };
  }

  if (rule.textPattern.endsWith("\\d{6}") && rule.replacement.endsWith("[REDACTED]")) {
    const context = extractContext(rule.textPattern);
    return {
      isMask: true,
      dataType: "OTP_6",
      format: "REDACTED",
      contextKeyword: context,
      summary: `6-Digit OTP ([REDACTED])${context ? ` [after "${context}"]` : ""}`,
    };
  }

  if (
    rule.textPattern.endsWith("(\\d{2})\\d{2}") &&
    (rule.replacement.endsWith("$1**") || rule.replacement.endsWith("$2**"))
  ) {
    const context = extractContext(rule.textPattern);
    return {
      isMask: true,
      dataType: "OTP_4",
      format: "KEEP_FIRST_2",
      contextKeyword: context,
      summary: `4-Digit PIN (12**)${context ? ` [after "${context}"]` : ""}`,
    };
  }

  if (
    rule.textPattern.endsWith("\\d{12}(\\d{4})") &&
    (rule.replacement.endsWith("$1") || rule.replacement.endsWith("$2"))
  ) {
    const context = extractContext(rule.textPattern);
    return {
      isMask: true,
      dataType: "CARD_16",
      format: "KEEP_LAST_4",
      contextKeyword: context,
      summary: `Card (****1234)${context ? ` [after "${context}"]` : ""}`,
    };
  }

  if (
    rule.textPattern.endsWith("(\\d{2})\\d{2,}") &&
    (rule.replacement.endsWith("$1****") || rule.replacement.endsWith("$2****"))
  ) {
    const context = extractContext(rule.textPattern);
    return {
      isMask: true,
      dataType: "ANY_NUMBERS",
      format: "KEEP_FIRST_2",
      contextKeyword: context,
      summary: `Numbers (49****)${context ? ` [after "${context}"]` : ""}`,
    };
  }

  return { isMask: false };
}

export const getMaskPreview = (
  dataType: MaskDataType,
  format: MaskFormat,
  contextKeyword: string
) => {
  const ctx = contextKeyword.trim() ? `${contextKeyword.trim()} ` : "";
  let sampleVal = "492812";
  let maskedVal = "49****";

  if (dataType === "OTP_6") {
    sampleVal = "492812";
    if (format === "KEEP_FIRST_2") maskedVal = "49****";
    else if (format === "KEEP_LAST_2") maskedVal = "****12";
    else if (format === "ALL_ASTERISKS") maskedVal = "******";
    else if (format === "REDACTED") maskedVal = "[REDACTED]";
  } else if (dataType === "OTP_4") {
    sampleVal = "4812";
    if (format === "KEEP_FIRST_2") maskedVal = "48**";
    else if (format === "KEEP_LAST_2") maskedVal = "**12";
    else if (format === "ALL_ASTERISKS") maskedVal = "****";
    else if (format === "REDACTED") maskedVal = "[REDACTED]";
  } else if (dataType === "CARD_16") {
    sampleVal = "4532890123456789";
    if (format === "KEEP_LAST_4") maskedVal = "************6789";
    else if (format === "KEEP_FIRST_2") maskedVal = "45**************";
    else if (format === "ALL_ASTERISKS") maskedVal = "****************";
    else if (format === "REDACTED") maskedVal = "[REDACTED]";
  } else if (dataType === "ANY_NUMBERS") {
    sampleVal = "893041";
    if (format === "KEEP_FIRST_2") maskedVal = "89****";
    else if (format === "KEEP_LAST_4") maskedVal = "**3041";
    else if (format === "REDACTED") maskedVal = "[REDACTED]";
    else maskedVal = "******";
  }

  const incoming = `Your verification is ${ctx}${sampleVal}`;
  const transformed = `Your verification is ${ctx}${maskedVal}`;

  return { incoming, transformed };
};
