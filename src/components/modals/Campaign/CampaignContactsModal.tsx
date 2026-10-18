import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Phone,
  Copy,
  Check,
  Search,
  Hash,
  Download,
  RotateCcw,
} from "lucide-react";
import Modal from "../../ui/Modal";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import ModalDataTable from "../../ui/ModalDataTable";
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

const TABLE_HEADERS = ["S.N.", "Phone Number"];
const TABLE_COLUMN_KEYS = ["sn", "phoneNumber"];

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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

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
    if (isLargeCampaign) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        fetchServerContacts(1, val, pageSize);
      }, 300);
    }
  };

  const handlePageChange = (newPage: number) => {
    const clamped = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(clamped);
    if (isLargeCampaign) {
      fetchServerContacts(clamped, searchTerm, pageSize);
    }
  };

  const handleRowsChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    if (isLargeCampaign) {
      fetchServerContacts(1, searchTerm, newSize);
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

  const tableData = useMemo(() => {
    return displayedContacts.map((num, idx) => ({
      sn: (currentPage - 1) * pageSize + idx + 1,
      phoneNumber: num,
    }));
  }, [displayedContacts, currentPage, pageSize]);

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
      className="max-w-xl sm:max-w-2xl"
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

        {/* ModalDataTable */}
        <ModalDataTable
          data={tableData}
          headers={TABLE_HEADERS}
          columnKeys={TABLE_COLUMN_KEYS}
          density="compact"
          serverSide={true}
          totalItems={totalCount}
          currentPage={currentPage}
          rowsPerPage={pageSize}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsChange}
          rowsPerPageOptions={rowsPerPageOptions}
          isLoading={isLoading}
          hasActiveFilters={Boolean(searchTerm)}
          onResetFilters={() => handleSearchChange("")}
          storageKey="campaign_contacts_modal_table"
          tableMaxHeight="360px"
          emptyMessage={
            searchTerm
              ? "No phone numbers match your search."
              : "No phone numbers recorded for this campaign."
          }
          errorMessage={
            hasError ? "Failed to load phone numbers from server." : null
          }
          headerActions={
            hasError ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  fetchServerContacts(currentPage, searchTerm, pageSize)
                }
                leftIcon={<RotateCcw size={13} />}
              >
                Retry
              </Button>
            ) : null
          }
          renderRow={(item, idx) => (
            <tr
              key={`${item.phoneNumber}-${idx}`}
              className="border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
            >
              <td className="py-2.5 px-3 text-center text-xs text-gray-400 dark:text-gray-500 font-mono select-none">
                {item.sn}
              </td>
              <td className="py-2.5 px-3 font-mono text-xs font-semibold text-text-primary dark:text-white group-hover:text-primary dark:group-hover:text-primary-light transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone
                      size={13}
                      className="text-gray-400 dark:text-gray-500 group-hover:text-primary dark:group-hover:text-primary-light shrink-0 transition-colors"
                    />
                    <span>{item.phoneNumber}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(item.phoneNumber);
                      toast.success(`Copied ${item.phoneNumber}`);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary dark:hover:text-white transition-opacity"
                    title="Copy number"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </td>
            </tr>
          )}
        />
      </div>
    </Modal>
  );
};

