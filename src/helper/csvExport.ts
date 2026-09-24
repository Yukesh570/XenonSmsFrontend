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

export const handleCsvExport = async (moduleName: string, searchParams: Record<string, any>) => {
    try {
        const validation = validateDateRange(searchParams);
        if (!validation.valid) {
            toast.error(validation.message);
            return;
        }

        const toastId = toast.loading("Export started. Please wait...");

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

        if (!data || !data.task_id) {
            toast.update(toastId, { render: "Failed to start export process.", type: "error", isLoading: false, autoClose: 3000 });
            return;
        }

        const taskId = data.task_id;
        let attempts = 0;
        const maxAttempts = 60; // 120 seconds total limit for big SMS files

        const checkStatus = setInterval(async () => {
            attempts += 1;
            try {
                const res = await downloadStatus(moduleName, taskId);

                if (res && res.progress) {
                    toast.update(toastId, { render: `Generating... ${res.progress}%` });
                }

                if (res && res.ready) {
                    clearInterval(checkStatus);
                    if (res.download_url) {
                        window.location.href = res.download_url;
                        toast.update(toastId, { render: "Export successful!", type: "success", isLoading: false, autoClose: 3000 });
                    } else {
                        toast.update(toastId, { render: res.error || "Export generated but URL is missing.", type: "error", isLoading: false, autoClose: 3000 });
                    }
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkStatus);
                    toast.update(toastId, { render: "Export timed out.", type: "error", isLoading: false, autoClose: 3000 });
                }
            } catch (error) {
                if (attempts >= maxAttempts) {
                    clearInterval(checkStatus);
                    toast.update(toastId, { render: "Failed to check status.", type: "error", isLoading: false, autoClose: 3000 });
                }
            }
        }, 2000);

    } catch (error) {
        console.error(error);
        toast.error("Failed to initiate export.");
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
    try {
        if (requireDateFilter) {
            const validation = validateDateRange(searchParams);
            if (!validation.valid) {
                toast.error(validation.message);
                return;
            }
        }

        const toastId = toast.loading("Export started. Please wait...");

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

        if (!data || !data.task_id) {
            toast.update(toastId, { render: "Failed to start export process.", type: "error", isLoading: false, autoClose: 3000 });
            return;
        }

        const taskId = data.task_id;
        let attempts = 0;
        const maxAttempts = 60;

        const checkStatus = setInterval(async () => {
            attempts += 1;
            try {
                const res = await downloadStatus("", taskId);

                if (res && res.progress) {
                    toast.update(toastId, { render: `Generating... ${res.progress}%` });
                }

                if (res && res.ready) {
                    clearInterval(checkStatus);
                    if (res.download_url) {
                        window.location.href = res.download_url;
                        toast.update(toastId, { render: "Export successful!", type: "success", isLoading: false, autoClose: 3000 });
                    } else {
                        toast.update(toastId, { render: res.error || "Export generated but URL is missing.", type: "error", isLoading: false, autoClose: 3000 });
                    }
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkStatus);
                    toast.update(toastId, { render: "Export timed out.", type: "error", isLoading: false, autoClose: 3000 });
                }
            } catch (error) {
                if (attempts >= maxAttempts) {
                    clearInterval(checkStatus);
                    toast.update(toastId, { render: "Failed to check status.", type: "error", isLoading: false, autoClose: 3000 });
                }
            }
        }, 2000);

    } catch (error) {
        console.error(error);
        toast.error("Failed to initiate export.");
    }
};
