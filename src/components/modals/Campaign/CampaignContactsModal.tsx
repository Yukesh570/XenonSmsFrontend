import React, { useState, useEffect, useMemo } from "react";
import {
  Phone,
  Copy,
  Check,
  Search,
  Hash,
  Download,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import Modal from "../../ui/Modal";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Select from "../../ui/Select";
import LoadingSpinner from "../../ui/LoadingSpinner";
import { toast } from "react-toastify";
import { getCampaignContactsApi } from "../../../api/campaignApi/campaignVendorApi";

interface CampaignContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId?: number;
  campaignName?: string;
  contacts?: string[];
  contactCount?: number;
}

const rowsPerPageOptions = [
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
  { value: "200", label: "200" },
  { value: "250", label: "250" },
  { value: "500", label: "500" },
  { value: "1000", label: "1000" },
];

export const CampaignContactsModal: React.FC<CampaignContactsModalProps> = ({
  isOpen,
  onClose,
  campaignId,
  campaignName,
  contacts = [],
  contactCount,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [hasCopiedAll, setHasCopiedAll] = useState(false);

  // Pagination states
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [jumpInput, setJumpInput] = useState<string>("1");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // Server-side state
  const isLargeCampaign = Boolean(campaignId);
  const [serverContacts, setServerContacts] = useState<string[]>([]);
  const [serverTotal, setServerTotal] = useState<number>(
    contactCount ?? contacts.length
  );

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setCurrentPage(1);
      setJumpInput("1");
      setHasError(false);
      if (isLargeCampaign && campaignId) {
        fetchServerContacts(1, "", pageSize);
      } else {
        setServerContacts(contacts);
        setServerTotal(contactCount ?? contacts.length);
      }
    }
  }, [isOpen, campaignId, isLargeCampaign]);

  useEffect(() => {
    setJumpInput(String(currentPage));
  }, [currentPage]);

  const fetchServerContacts = async (
    page: number,
    search: string,
    size: number = pageSize
  ) => {
    if (!campaignId) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await getCampaignContactsApi(campaignId, page, size, search);
      if (res && res.results) {
        setServerContacts(res.results.map((r: any) => r.contactNumber));
        setServerTotal(res.count ?? 0);
      }
    } catch (e) {
      console.error(e);
      setHasError(true);
      toast.error("Failed to fetch campaign contacts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
    setJumpInput("1");
    if (isLargeCampaign) {
      fetchServerContacts(1, val, pageSize);
    }
  };

  const handlePageChange = (newPage: number) => {
    const clamped = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(clamped);
    setJumpInput(String(clamped));
    if (isLargeCampaign) {
      fetchServerContacts(clamped, searchTerm, pageSize);
    }
  };

  const handleRowsChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setJumpInput("1");
    if (isLargeCampaign) {
      fetchServerContacts(1, searchTerm, newSize);
    }
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      handlePageChange(parsed);
    } else {
      setJumpInput(String(currentPage));
    }
  };

  const handleJumpBlur = () => {
    const parsed = parseInt(jumpInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      if (parsed !== currentPage) {
        handlePageChange(parsed);
      }
    } else {
      setJumpInput(String(currentPage));
    }
  };

  // Client-side filtering & slicing fallback
  const filteredClientContacts = useMemo(() => {
    if (!searchTerm.trim()) return contacts;
    const term = searchTerm.trim().toLowerCase();
    return contacts.filter((c) => c.toLowerCase().includes(term));
  }, [contacts, searchTerm]);

  const displayedContacts = useMemo(() => {
    if (isLargeCampaign) {
      return serverContacts;
    }
    const startIndex = (currentPage - 1) * pageSize;
    return filteredClientContacts.slice(startIndex, startIndex + pageSize);
  }, [
    isLargeCampaign,
    serverContacts,
    filteredClientContacts,
    currentPage,
    pageSize,
  ]);

  const totalCount = isLargeCampaign
    ? serverTotal
    : filteredClientContacts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);
  const paginationLabel = `${startItem}-${endItem} of ${totalCount}`;
  const handleCopyAll = () => {
    const listToCopy = displayedContacts;
    if (listToCopy.length === 0) return;
    navigator.clipboard.writeText(listToCopy.join("\n"));
    setHasCopiedAll(true);
    toast.success(`Copied ${listToCopy.length} numbers to clipboard`);
    setTimeout(() => setHasCopiedAll(false), 2000);
  };

  const handleExportCsv = async () => {
    if (!campaignId) {
      downloadCsv(displayedContacts, campaignName || "campaign");
      return;
    }

    setIsExporting(true);
    try {
      const allNumbers: string[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 50) {
        // fetch up to 50,000 using batches of 1000
        const res = await getCampaignContactsApi(campaignId, page, 1000, "");
        if (res && res.results && res.results.length > 0) {
          res.results.forEach((r: any) => allNumbers.push(r.contactNumber));
          if (!res.next || allNumbers.length >= res.count) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      downloadCsv(allNumbers, campaignName || "campaign");
      toast.success(`Exported ${allNumbers.length} numbers to CSV`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to export contacts");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadCsv = (numbers: string[], name: string) => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Phone Number", ...numbers].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${name.replace(/\s+/g, "_")}_phone_numbers.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Phone size={18} className="text-primary" />
          <span>Phone Numbers &bull;</span>
          <span className="text-primary font-bold">
            {campaignName || "Campaign"}
          </span>
        </div>
      }
      className="max-w-xl"
    >
      <div className="space-y-4">
        {/* Top Info Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <Hash size={16} />
            </span>
            <div>
              <div className="text-xs text-text-secondary dark:text-gray-400">
                Total Recipients
              </div>
              <div className="text-base font-bold text-text-primary dark:text-white">
                {totalCount.toLocaleString()}{" "}
                {totalCount === 1 ? "Number" : "Numbers"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExportCsv}
              disabled={isExporting || totalCount === 0}
              leftIcon={<Download size={14} />}
            >
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>

            {displayedContacts.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopyAll}
                leftIcon={
                  hasCopiedAll ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} />
                  )
                }
              >
                {hasCopiedAll ? "Copied!" : "Copy"}
              </Button>
            )}
          </div>
        </div>

        {/* Search Input */}
        {(totalCount > 5 || searchTerm) && (
          <Input
            id="campaign-contacts-search"
            placeholder="Search phone number..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            leftIcon={<Search size={15} className="text-gray-400" />}
          />
        )}

        {/* Proper Xenon SMS Standard Pagination Bar (Above Data) */}
        {totalCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-0.5 text-xs text-text-secondary dark:text-gray-300">
            {/* Rows Per Page */}
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="text-xs text-text-secondary dark:text-gray-400 whitespace-nowrap">
                Rows per page:
              </span>
              <div className="w-[92px] shrink-0 rows-per-page-select">
                <Select
                  value={String(pageSize)}
                  onChange={(val) => handleRowsChange(Number(val))}
                  options={rowsPerPageOptions}
                  clearable={false}
                  placement="bottom"
                  minMenuWidth={92}
                />
              </div>
            </div>

            {/* Combined Pagination Bar */}
            <div className="h-[34px] inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-text-secondary dark:text-gray-300 shadow-sm overflow-hidden ml-auto">
              {/* Range Count */}
              <span className="px-2.5 font-medium whitespace-nowrap border-r border-gray-200 dark:border-gray-700 h-full flex items-center select-none text-[11px] sm:text-xs">
                {paginationLabel}
              </span>

              {/* Previous Button */}
              <button
                type="button"
                className="shrink-0 h-full px-2 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-gray-200 dark:border-gray-700"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                title="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page Jumper */}
              <form
                onSubmit={handleJumpSubmit}
                className="flex items-center gap-1 px-2 h-full"
              >
                <span className="text-[11px] sm:text-xs text-text-secondary dark:text-gray-400 select-none">
                  Page
                </span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  onBlur={handleJumpBlur}
                  disabled={isLoading || totalPages <= 1}
                  className="w-9 h-5 text-center text-xs font-semibold rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                />
                <span className="text-[11px] sm:text-xs text-text-secondary dark:text-gray-400 select-none">
                  of {totalPages}
                </span>
              </form>

              {/* Next Button */}
              <button
                type="button"
                className="shrink-0 h-full px-2 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-l border-gray-200 dark:border-gray-700"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
                title="Next Page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Numbers List */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 min-h-[160px] max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner size="sm" text="Loading numbers..." />
            </div>
          ) : hasError ? (
            <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-3">
              <div className="p-2.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500">
                <AlertCircle size={22} />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary dark:text-white">
                  Failed to load phone numbers
                </p>
                <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
                  An error occurred while fetching contacts from the server.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  fetchServerContacts(currentPage, searchTerm, pageSize)
                }
                leftIcon={<RotateCcw size={14} />}
              >
                Retry
              </Button>
            </div>
          ) : displayedContacts.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-secondary dark:text-gray-400">
              {totalCount === 0
                ? "No phone numbers recorded for this campaign."
                : "No phone numbers match your search."}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {displayedContacts.map((num, idx) => {
                const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <div
                    key={`${num}-${idx}`}
                    className="flex items-center gap-2 px-3 py-0.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/60 transition-colors group"
                  >
                    <span className="text-[11px] text-gray-400 dark:text-gray-400 font-mono w-7 text-right group-hover:text-primary dark:group-hover:text-primary-light transition-colors leading-none select-none">
                      {globalIndex}.
                    </span>
                    <span className="font-mono text-xs font-semibold text-text-primary dark:text-white group-hover:text-primary dark:group-hover:text-primary-light transition-colors leading-none">
                      {num}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
