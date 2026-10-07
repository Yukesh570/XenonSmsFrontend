import { toast } from "react-toastify";
import { downloadCSVApi } from "../api/reportApi/messageReportApi";
import { downloadStatus } from "../api/downloadApi/downloadApi";

export const validateDateRange = (params: Record<string, any>): { valid: boolean; message: string } => {
    const dateKeys = ["createdAt", "queued_at", "submitted_at", "delivered_at", "failed_at", "request_time", "delivery_time"];
    let hasDateFilter = false;

    for (const key of dateKeys) {
        if (params[`${key}__range`]) {
            hasDateFilter = true;
            const [start, end] = params[`${key}__range`].split(",");
            if (start && end) {
                const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 31) {
                    return { valid: false, message: "Maximum allowed date range cannot exceed 1 month." };
                }
            } else {
                return { valid: false, message: "Invalid date range format." };
            }
        } else if (params[`${key}__gte`] || params[`${key}__lte`]) {
            hasDateFilter = true;
            const start = params[`${key}__gte`];
            const end = params[`${key}__lte`];

            if (start && end) {
                const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 31) {
                    return { valid: false, message: "Maximum allowed date range cannot exceed 1 month." };
                }
            } else {
                return { valid: false, message: "Both start and end dates must be provided to bound the range to 1 month." };
            }
        }
    }

    if (!hasDateFilter) {
        return { valid: false, message: "Please apply a date filter (max 1 month)" };
    }

    return { valid: true, message: "" };
};

const getErrorMessage = (errorOrData: any, fallback: string = "Export failed."): string => {
    if (!errorOrData) return fallback;
    if (typeof errorOrData === "string") return errorOrData;
    if (errorOrData.response?.data) {
        const d = errorOrData.response.data;
        if (typeof d === "string") return d;
        if (d.error) return typeof d.error === "string" ? d.error : JSON.stringify(d.error);
        if (d.message) return typeof d.message === "string" ? d.message : JSON.stringify(d.message);
        if (d.detail) return typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail);
        return fallback;
    }
    const err =
        errorOrData.error ||
        errorOrData.message ||
        errorOrData.detail ||
        errorOrData.result?.error ||
        errorOrData.result?.message ||
        (typeof errorOrData.result === "string" ? errorOrData.result : null);

    if (err) {
        return typeof err === "string" ? err : JSON.stringify(err);
    }
    return errorOrData.message || fallback;
};

const pollCsvTaskStatus = (
    toastId: any,
    taskId: string,
    moduleName: string = ""
) => {
    let attempts = 0;
    let consecutiveErrors = 0;
    const maxAttempts = 60; // 120 seconds total

    const checkStatus = setInterval(async () => {
        attempts += 1;
        try {
            const res = await downloadStatus(moduleName, taskId);
            consecutiveErrors = 0;

            const statusStr = String(res?.status || res?.state || "").toUpperCase();
            const downloadUrl = res?.download_url || res?.result?.download_url;

            // Check failure conditions
            const isFailed =
                statusStr === "FAILURE" ||
                statusStr === "FAILED" ||
                statusStr === "ERROR" ||
                statusStr === "REVOKED" ||
                res?.failed === true ||
                res?.successful === false ||
                Boolean(res?.ready && !downloadUrl);

            if (isFailed) {
                clearInterval(checkStatus);
                const errorMsg = getErrorMessage(res, "Export failed on the server.");
                toast.update(toastId, {
                    render: typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg),
                    type: "error",
                    isLoading: false,
                    autoClose: 4000
                });
                return;
            }

            // Check success conditions
            const isReady = res?.ready === true || statusStr === "SUCCESS";
            if (isReady && downloadUrl) {
                clearInterval(checkStatus);
                window.location.href = downloadUrl;
                toast.update(toastId, {
                    render: "Export successful!",
                    type: "success",
                    isLoading: false,
                    autoClose: 3000
                });
                return;
            }

            // Check progress
            if (res && res.progress !== undefined && res.progress !== null) {
                toast.update(toastId, { render: `Generating... ${res.progress}%` });
            }

            // Check timeout
            if (attempts >= maxAttempts) {
                clearInterval(checkStatus);
                toast.update(toastId, {
                    render: "Export timed out.",
                    type: "error",
                    isLoading: false,
                    autoClose: 4000
                });
            }
        } catch (error: any) {
            // If the server responded with an HTTP error code (4xx, 5xx), the task/endpoint failed
            if (error?.response) {
                clearInterval(checkStatus);
                const errorMsg = getErrorMessage(error, "Failed to check export status.");
                toast.update(toastId, {
                    render: typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg),
                    type: "error",
                    isLoading: false,
                    autoClose: 4000
                });
                return;
            }

            consecutiveErrors += 1;
            if (consecutiveErrors >= 3 || attempts >= maxAttempts) {
                clearInterval(checkStatus);
                toast.update(toastId, {
                    render: "Failed to check status.",
                    type: "error",
                    isLoading: false,
                    autoClose: 4000
                });
            }
        }
    }, 2000);
};

export const handleCsvExport = async (moduleName: string, searchParams: Record<string, any>) => {
    let toastId: any = null;
    try {
        const validation = validateDateRange(searchParams);
        if (!validation.valid) {
            toast.error(validation.message);
            return;
        }

        toastId = toast.loading("Export started. Please wait...");

        // Map date filters to startDate and endDate for the backend CSV API
        const apiParams = { ...searchParams };
        const dateKeys = ["createdAt", "queued_at", "submitted_at", "delivered_at", "failed_at"];
        for (const key of dateKeys) {
            if (apiParams[`${key}__range`]) {
                const [start, end] = apiParams[`${key}__range`].split(",");
                apiParams.startDate = start;
                apiParams.endDate = end;
                delete apiParams[`${key}__range`];
                break;
            } else if (apiParams[`${key}__gte`] || apiParams[`${key}__lte`]) {
                if (apiParams[`${key}__gte`]) apiParams.startDate = apiParams[`${key}__gte`];
                if (apiParams[`${key}__lte`]) apiParams.endDate = apiParams[`${key}__lte`];
                delete apiParams[`${key}__gte`];
                delete apiParams[`${key}__lte`];
                break;
            }
        }

        const data: any = await downloadCSVApi(moduleName, apiParams);

        const initialStatus = String(data?.status || data?.state || "").toUpperCase();
        if (!data || !data.task_id || initialStatus === "FAILURE" || initialStatus === "FAILED" || initialStatus === "ERROR") {
            const errorMsg = getErrorMessage(data, "Failed to start export process.");
            toast.update(toastId, {
                render: typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg),
                type: "error",
                isLoading: false,
                autoClose: 4000
            });
            return;
        }

        pollCsvTaskStatus(toastId, data.task_id, moduleName);

    } catch (error: any) {
        console.error(error);
        const errorMsg = getErrorMessage(error, "Failed to initiate export.");
        if (toastId) {
            toast.update(toastId, {
                render: typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg),
                type: "error",
                isLoading: false,
                autoClose: 4000
            });
        } else {
            toast.error(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
        }
    }
};

/**
 * Generic CSV export handler — same polling flow as handleCsvExport but
 * accepts any async API function that returns { task_id, status }.
 * Use this for reports that have their own download endpoint.
 */
export const handleCsvExportWithApi = async (
    apiFn: (params: Record<string, any>) => Promise<any>,
    searchParams: Record<string, any>,
    dateKeys: string[] = ["request_time", "queued_at", "submitted_at", "delivered_at", "failed_at"],
    requireDateFilter: boolean = true,
) => {
    let toastId: any = null;
    try {
        if (requireDateFilter) {
            const validation = validateDateRange(searchParams);
            if (!validation.valid) {
                toast.error(validation.message);
                return;
            }
        }

        toastId = toast.loading("Export started. Please wait...");

        const apiParams = { ...searchParams };
        for (const key of dateKeys) {
            if (apiParams[`${key}__range`]) {
                const [start, end] = apiParams[`${key}__range`].split(",");
                apiParams.startDate = start;
                apiParams.endDate = end;
                delete apiParams[`${key}__range`];
                break;
            } else if (apiParams[`${key}__gte`] || apiParams[`${key}__lte`]) {
                if (apiParams[`${key}__gte`]) apiParams.startDate = apiParams[`${key}__gte`];
                if (apiParams[`${key}__lte`]) apiParams.endDate = apiParams[`${key}__lte`];
                delete apiParams[`${key}__gte`];
                delete apiParams[`${key}__lte`];
                break;
            }
        }

        const data: any = await apiFn(apiParams);

        const initialStatus = String(data?.status || data?.state || "").toUpperCase();
        if (!data || !data.task_id || initialStatus === "FAILURE" || initialStatus === "FAILED" || initialStatus === "ERROR") {
            const errorMsg = getErrorMessage(data, "Failed to start export process.");
            toast.update(toastId, {
                render: typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg),
                type: "error",
                isLoading: false,
                autoClose: 4000
            });
            return;
        }

        pollCsvTaskStatus(toastId, data.task_id, "");

    } catch (error: any) {
        console.error(error);
        const errorMsg = getErrorMessage(error, "Failed to initiate export.");
        if (toastId) {
            toast.update(toastId, {
                render: typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg),
                type: "error",
                isLoading: false,
                autoClose: 4000
            });
        } else {
            toast.error(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
        }
    }
};
