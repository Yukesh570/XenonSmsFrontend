import React, { useState, useEffect, useRef, useCallback } from "react";
import Modal from "../../ui/Modal";
import ModalDataTable from "../../ui/ModalDataTable";
import FilterCard from "../../ui/FilterCard";
import { toast } from "react-toastify";
import Button from "../../ui/Button";
import { RefreshCw } from "lucide-react";
import Select from "../../ui/Select";
import Input from "../../ui/Input";
import { StatusBadge } from "../../ui/StatusBadge";
import { getCustomerRateExportLogsApi, retryCustomerRateExportApi, type CustomerRateExportLogData } from "../../../api/rateApi/customerRateApi";

interface CustomerRateExportLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  rateGroup: any;
}

const statusOptions = [
  { label: "Pending", value: "PENDING" },
  { label: "Success", value: "SUCCESS" },
  { label: "Failed", value: "FAILED" },
];

export const CustomerRateExportLogModal: React.FC<CustomerRateExportLogModalProps> = ({
  isOpen,
  onClose,
  rateGroup,
}) => {
  const [logs, setLogs] = useState<CustomerRateExportLogData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchLogs = useCallback(async (
    page: number,
    pageSize: number,
    filters: Record<string, any> = {}
  ) => {
    if (!isOpen || !rateGroup?.id) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const newController = new AbortController();
    abortControllerRef.current = newController;

    setIsLoading(true);
    try {
      const searchParams = { ...filters, rateGroup__id: rateGroup.id };

      const res: any = await getCustomerRateExportLogsApi(page, pageSize, searchParams);
      if (newController.signal.aborted) return;

      if (Array.isArray(res)) {
        setLogs(res);
        setTotalItems(res.length);
      } else {
        setLogs(res.results || []);
        setTotalItems(res.count || 0);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Failed to fetch export logs:", error);
        toast.error("Failed to load export logs.");
        setLogs([]);
      }
    } finally {
      if (abortControllerRef.current === newController) {
        setIsLoading(false);
      }
    }
  }, [isOpen, rateGroup?.id]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs(1, rowsPerPage, filterValues);
    } else {
      setLogs([]);
      setFilterValues({});
      setCurrentPage(1);
    }
  }, [isOpen, fetchLogs]);


  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchLogs(page, rowsPerPage, filterValues);
  };

  const handleRowsPerPageChange = (size: number) => {
    setRowsPerPage(size);
    setCurrentPage(1);
    fetchLogs(1, size, filterValues);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLogs(1, rowsPerPage, filterValues);
  };

  const handleClearFilters = () => {
    setFilterValues({});
    setCurrentPage(1);
    fetchLogs(1, rowsPerPage, {});
  };

  const handleRetry = async (id: number) => {
    try {
      await retryCustomerRateExportApi(id);
      toast.success("Retry triggered successfully.");
      handleSearch();
    } catch (error: any) {
      console.error("Failed to retry export:", error);
      toast.error(error?.response?.data?.message || "Failed to retry export.");
    }
  };

  const renderCell = (log: CustomerRateExportLogData, colKey: string) => {
    switch (colKey) {
      case "id":
        return <span className="font-medium text-text-primary dark:text-white">#{log.id}</span>;
      case "exportType":
        return <span className="text-text-secondary dark:text-gray-300">{log.exportType}</span>;
      case "totalRatesExported":
        return <span className="text-text-secondary dark:text-gray-300">{log.totalRatesExported}</span>;
      case "sentToEmails":
        return <span className="text-text-secondary dark:text-gray-300 truncate max-w-xs">{log.sentToEmails}</span>;
      case "status":
        return (
          <StatusBadge
            status={log.status === "SUCCESS" ? "ACTIVE" : log.status}
            customText={log.status}
          />
        );
      case "errorMessage":
        return <span className="text-red-500 dark:text-red-400 truncate max-w-xs block overflow-hidden text-ellipsis">{log.errorMessage || "-"}</span>;
      case "createdBy":
        return <span className="text-text-secondary dark:text-gray-300">{log.createdByName || log.createdBy || "-"}</span>;
      case "createdAt":
        return <span className="text-text-secondary dark:text-gray-300">{new Date(log.createdAt).toLocaleString()}</span>;
      case "actions":
        return (
          <div className="flex justify-start items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleRetry(log.id)}
              leftIcon={<RefreshCw size={14} />}
            >
              Retry
            </Button>
          </div>
        );
      default:
        return <span className="text-text-secondary dark:text-gray-300">{(log as any)[colKey]}</span>;
    }
  };

  const activeHeaders = [
    "S.N.",
    "ID",
    "Export Type",
    "Status",
    "Total Rates",
    "Sent To",
    "Error",
    "Created By",
    "Created At",
    "Actions"
  ];

  const colKeys = [
    "id",
    "exportType",
    "status",
    "totalRatesExported",
    "sentToEmails",
    "errorMessage",
    "createdBy",
    "createdAt",
    "actions"
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Export Logs: ${rateGroup?.name || "Rate Group"}`}
      className="!max-w-[85vw] !w-[85vw]"
    >
      <div className="flex flex-col h-full space-y-4">
        {/* Filters */}
        <FilterCard
          onSearch={handleSearch}
          onClear={handleClearFilters}
          defaultOpen={true}
          extraActions={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fetchLogs(currentPage, rowsPerPage, filterValues)}
              leftIcon={<RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />}
            >
              Refresh
            </Button>
          }
        >
          <Select
            label="Status"
            value={filterValues.status || ""}
            onChange={(v) => handleFilterChange("status", v)}
            options={[{ label: "All Status", value: "" }, ...statusOptions]}
          />
          <Input
            label="Export Type"
            name="exportType__icontains"
            value={filterValues.exportType__icontains || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange("exportType__icontains", e.target.value)}
            placeholder="Export Type..."
          />
          <Input
            label="Created By"
            name="createdBy__username__icontains"
            value={filterValues.createdBy__username__icontains || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange("createdBy__username__icontains", e.target.value)}
            placeholder="Created By..."
          />
          <Input
            label="Rate Group"
            name="rateGroup__name__icontains"
            value={filterValues.rateGroup__name__icontains || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange("rateGroup__name__icontains", e.target.value)}
            placeholder="Rate Group..."
          />
          <Input
            label="Sent To Email"
            name="sentToEmails__icontains"
            value={filterValues.sentToEmails__icontains || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange("sentToEmails__icontains", e.target.value)}
            placeholder="Search email..."
          />
          <Input
            label="Error Message"
            name="errorMessage__icontains"
            value={filterValues.errorMessage__icontains || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange("errorMessage__icontains", e.target.value)}
            placeholder="Search error..."
          />
          <Input
            type="date"
            label="Date From"
            name="createdAt__gte"
            value={filterValues.createdAt__gte || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange("createdAt__gte", e.target.value)}
          />
        </FilterCard>

        {/* Data Table */}
        <div className="flex-1 overflow-hidden min-h-[600px]">
          <ModalDataTable
            data={logs}
            headers={activeHeaders}
            isLoading={isLoading}
            totalItems={totalItems}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            renderRow={(log: CustomerRateExportLogData, index: number) => {
              const serialNumber = (currentPage - 1) * rowsPerPage + index + 1;
              return (
                <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="px-4 py-3 text-sm text-text-secondary dark:text-gray-300 font-medium whitespace-nowrap">
                    {serialNumber}
                  </td>
                  {colKeys.map((colKey) => (
                    <td key={colKey} className="px-4 py-3 text-sm max-w-[200px]" style={{ wordBreak: 'break-word' }}>
                      {renderCell(log, colKey)}
                    </td>
                  ))}
                </tr>
              );
            }}
          />
        </div>
      </div>
    </Modal>
  );
};
