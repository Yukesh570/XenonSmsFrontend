import React, { useState, useEffect, useRef } from "react";
import { Home, Search, RotateCcw, Info } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";

import {
  getPrefixLookupApi,
  type PrefixLookupData,
} from "../../api/prefixLookupApi/prefixLookupApi";

import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { actionHelper } from "../../helper/action";

export interface PrefixLookupItem {
  searchedNumber: string;
  normalizedNumber: string;
  countryName: string;
  countryCode: string;
  mcc: string;
  mnc: string;
  mccmnc: string;
  operator: string;
  matchedPrefixStart: string;
  matchedPrefixEnd: string;
}

const PrefixLookup: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [lookupResult, setLookupResult] = useState<PrefixLookupItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const hasLoggedOpening = useRef(false);
  useEffect(() => {
    if (!hasLoggedOpening.current) {
      setTimeout(() => {
        actionHelper("Prefix Lookup", "Opened Prefix Lookup Module", false);
      }, 100);
      hasLoggedOpening.current = true;
    }
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmed = phoneNumber.trim();
    if (!trimmed) {
      toast.error("Please enter a phone number to search.");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setSearchError(null);
    setLookupResult(null);

    try {
      const response = await getPrefixLookupApi(trimmed);

      if (response?.error) {
        setSearchError(response.error);
        return;
      }

      let item: PrefixLookupData | null = null;
      if (Array.isArray(response) && response.length > 0) {
        item = response[0];
      } else if (
        response?.results &&
        Array.isArray(response.results) &&
        response.results.length > 0
      ) {
        item = response.results[0];
      } else if (response && typeof response === "object") {
        if (
          !response.searched_number &&
          !response.normalized_number &&
          !response.operator &&
          !response.country &&
          !response.mccmnc
        ) {
          setSearchError("No prefix match found for this number.");
          return;
        }
        item = response;
      }

      if (!item) {
        setSearchError("No prefix match found for this number.");
        return;
      }

      setLookupResult({
        searchedNumber: item.searched_number || trimmed,
        normalizedNumber: item.normalized_number || item.searched_number || trimmed,
        countryName: item.country?.name || "-",
        countryCode: item.country?.code || "",
        mcc: item.mcc || "-",
        mnc: item.mnc || "-",
        mccmnc:
          item.mccmnc ||
          (item.mcc && item.mnc ? `${item.mcc}${item.mnc}` : "-"),
        operator: item.operator || "-",
        matchedPrefixStart:
          item.matchedPrefixStart != null
            ? String(item.matchedPrefixStart)
            : "-",
        matchedPrefixEnd:
          item.matchedPrefixEnd != null
            ? String(item.matchedPrefixEnd)
            : "-",
      });
    } catch (error: any) {
      let backendError = "Failed to lookup prefix for the provided number.";
      if (error.response?.status === 404) {
        backendError = "No prefix match found for this number.";
      } else if (
        error.response?.data &&
        typeof error.response.data === "object"
      ) {
        backendError =
          error.response.data.error ||
          error.response.data.message ||
          error.response.data.detail ||
          backendError;
      } else if (
        typeof error.response?.data === "string" &&
        !error.response.data.trim().startsWith("<")
      ) {
        backendError = error.response.data;
      } else if (error.message && !error.message.includes("status code 404")) {
        backendError = error.message;
      }
      setSearchError(backendError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setPhoneNumber("");
    setLookupResult(null);
    setSearchError(null);
    setHasSearched(false);
  };

  return (
    <div className="container mx-auto pb-10">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-text-primary dark:text-white">
          Prefix Lookup
        </h1>
        <div className="flex items-center space-x-2 text-sm text-text-secondary">
          <Home size={16} className="text-gray-400" />
          <NavLink to="/dashboard" className="text-gray-400 hover:text-primary">
            Home
          </NavLink>
          <span>/</span>
          <span className="text-text-primary dark:text-white">Prefix Lookup</span>
        </div>
      </div>

      {/* Search Input Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <Input
              label="Phone Number"
              placeholder="e.g. 573222000000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClear}
              leftIcon={<RotateCcw size={15} />}
            >
              Clear
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              leftIcon={<Search size={15} />}
            >
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </div>
        </form>
      </div>

      {/* Instruction Note on Initial Load */}
      {!hasSearched && (
        <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-gray-800/60 border border-blue-100 dark:border-gray-700/80 flex items-center space-x-3 text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
          <Info size={18} className="shrink-0 text-blue-500 dark:text-blue-400" />
          <p>
            <span className="font-semibold">Instruction:</span> Please enter a valid phone number and click <span className="font-semibold">Search</span> to perform a prefix lookup.
          </p>
        </div>
      )}

      {/* Results View - Clean Client-Style Card */}
      {hasSearched && (
        <>
          {isLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-12 flex flex-col items-center justify-center min-h-[260px] max-w-2xl mx-auto">
              <LoadingSpinner text="Searching prefix database..." />
            </div>
          ) : searchError ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 text-center max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
                <Info size={24} />
              </div>
              <h3 className="text-base font-semibold text-text-primary dark:text-white mb-1">
                No Prefix Match
              </h3>
              <p className="text-sm text-text-secondary dark:text-gray-400 max-w-md mx-auto">
                {searchError}
              </p>
            </div>
          ) : lookupResult ? (
            <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              {/* Centered Card Title */}
              <h2 className="text-center font-semibold text-base sm:text-lg text-text-primary dark:text-white py-5 border-b border-gray-100 dark:border-gray-700/80">
                Prefix Lookup Results
              </h2>

              {/* 2-Column Minimal Timeline matching client screenshot */}
              <div className="p-8 sm:p-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-14">
                  {/* Left Column */}
                  <div className="relative pl-7 before:absolute before:left-[4px] before:top-2 before:bottom-3 before:w-[2px] before:bg-primary/40 dark:before:bg-primary/50 space-y-7">
                    {/* Item 1: MCC MNC */}
                    <div className="relative">
                      <div className="absolute -left-[28px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                      <span className="text-xs text-text-secondary dark:text-gray-400 block font-normal">
                        MCC MNC
                      </span>
                      <span className="text-base sm:text-lg font-semibold text-text-primary dark:text-white block mt-0.5">
                        {lookupResult.mccmnc}
                      </span>
                    </div>

                    {/* Item 2: MCC */}
                    <div className="relative">
                      <div className="absolute -left-[28px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                      <span className="text-xs text-text-secondary dark:text-gray-400 block font-normal">
                        MCC
                      </span>
                      <span className="text-base sm:text-lg font-semibold text-text-primary dark:text-white block mt-0.5">
                        {lookupResult.mcc}
                      </span>
                    </div>

                    {/* Item 3: MNC */}
                    <div className="relative">
                      <div className="absolute -left-[28px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                      <span className="text-xs text-text-secondary dark:text-gray-400 block font-normal">
                        MNC
                      </span>
                      <span className="text-base sm:text-lg font-semibold text-text-primary dark:text-white block mt-0.5">
                        {lookupResult.mnc}
                      </span>
                    </div>

                    {/* Item 4: Normalized Number (Vpc in Client UI) */}
                    <div className="relative">
                      <div className="absolute -left-[28px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                      <span className="text-xs text-text-secondary dark:text-gray-400 block font-normal">
                        Normalized Number
                      </span>
                      <span className="text-base sm:text-lg font-semibold text-text-primary dark:text-white block mt-0.5">
                        {lookupResult.normalizedNumber}
                      </span>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="relative pl-7 before:absolute before:left-[4px] before:top-2 before:bottom-3 before:w-[2px] before:bg-primary/40 dark:before:bg-primary/50 space-y-7">
                    {/* Item 1: Country */}
                    <div className="relative">
                      <div className="absolute -left-[28px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                      <span className="text-xs text-text-secondary dark:text-gray-400 block font-normal">
                        Country
                      </span>
                      <span className="text-base sm:text-lg font-semibold text-text-primary dark:text-white block mt-0.5">
                        {lookupResult.countryName}
                      </span>
                    </div>

                    {/* Item 2: Operator */}
                    <div className="relative">
                      <div className="absolute -left-[28px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                      <span className="text-xs text-text-secondary dark:text-gray-400 block font-normal">
                        Operator
                      </span>
                      <span className="text-base sm:text-lg font-semibold text-text-primary dark:text-white block mt-0.5">
                        {lookupResult.operator}
                      </span>
                    </div>

                    {/* Item 3: Prefix Start Range */}
                    <div className="relative">
                      <div className="absolute -left-[28px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                      <span className="text-xs text-text-secondary dark:text-gray-400 block font-normal">
                        Prefix Start Range
                      </span>
                      <span className="text-base sm:text-lg font-semibold text-text-primary dark:text-white block mt-0.5">
                        {lookupResult.matchedPrefixStart}
                      </span>
                    </div>

                    {/* Item 4: Prefix End Range */}
                    <div className="relative">
                      <div className="absolute -left-[28px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                      <span className="text-xs text-text-secondary dark:text-gray-400 block font-normal">
                        Prefix End Range
                      </span>
                      <span className="text-base sm:text-lg font-semibold text-text-primary dark:text-white block mt-0.5">
                        {lookupResult.matchedPrefixEnd}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default PrefixLookup;
