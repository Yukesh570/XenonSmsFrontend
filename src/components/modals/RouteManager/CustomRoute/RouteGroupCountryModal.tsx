// import React, { useState, useEffect } from "react";
// import { toast } from "react-toastify";
// import { Trash2, Plus } from "lucide-react";
// import Modal from "../../../ui/Modal";
// import Button from "../../../ui/Button";
// import Select from "../../../ui/Select";
// import {
//   getRouteGroupCountriesApi,
//   createRouteGroupCountryApi,
//   deleteRouteGroupCountryApi,
//   type RouteGroupCountryData,
// } from "../../../../api/routeManagerApi/customRouteApi";
// import { getCountriesApi } from "../../../../api/settingApi/countryApi/countryApi";
// import { DeleteModal } from "../../DeleteModal";

// interface RouteGroupCountryModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onSuccess: () => void;
//   moduleName: string;
//   routeGroupId: number | null;
//   routeGroupName: string | null;
// }

// const routingTypeOptions = [
//   { label: "Priority", value: "PRIORITY" },
//   { label: "Percentage", value: "PERCENTAGE" },
// ];

// const statusOptions = [
//   { label: "Active", value: "ACTIVE" },
//   { label: "Inactive", value: "INACTIVE" },
// ];

// export const RouteGroupCountryModal: React.FC<RouteGroupCountryModalProps> = ({
//   isOpen,
//   onClose,
//   onSuccess,
//   moduleName,
//   routeGroupId,
//   routeGroupName,
// }) => {
//   const [configs, setConfigs] = useState<RouteGroupCountryData[]>([]);
//   const [countryOptions, setCountryOptions] = useState<{ label: string; value: string }[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [deleteId, setDeleteId] = useState<number | null>(null);

//   const [newForm, setNewForm] = useState({
//     country: "",
//     routingType: "PRIORITY",
//     status: "ACTIVE",
//   });

//   const fetchConfigs = async () => {
//     if (!routeGroupId) return;
//     setIsLoading(true);
//     try {
//       const res = await getRouteGroupCountriesApi(moduleName, 1, 1000, {
//         routeGroup: routeGroupId,
//         isDeleted: false,
//       });
//       setConfigs(res.results || []);
//     } catch {
//       toast.error("Failed to load country configurations.");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (isOpen && routeGroupId) {
//       fetchConfigs();
//       getCountriesApi("country", 1, 1000)
//         .then((res: any) => {
//           const list = res.results || (Array.isArray(res) ? res : []);
//           setCountryOptions(list.map((c: any) => ({ label: c.name, value: String(c.id) })));
//         })
//         .catch(() => toast.error("Failed to load countries."));
//     }
//   }, [isOpen, routeGroupId]);

//   const handleAdd = async () => {
//     if (!newForm.country) return toast.error("Select a country.");
//     if (!routeGroupId) return;
//     setIsSubmitting(true);
//     try {
//       await createRouteGroupCountryApi(
//         {
//           routeGroup: routeGroupId,
//           country: Number(newForm.country),
//           routingType: newForm.routingType as "PRIORITY" | "PERCENTAGE",
//           status: newForm.status as "ACTIVE" | "INACTIVE",
//         },
//         moduleName,
//       );
//       toast.success("Country configuration added.");
//       setNewForm({ country: "", routingType: "PRIORITY", status: "ACTIVE" });
//       fetchConfigs();
//       onSuccess();
//     } catch (err: any) {
//       const data = err.response?.data;
//       if (data && typeof data === "object") {
//         Object.entries(data).forEach(([k, msgs]) => {
//           const msg = Array.isArray(msgs) ? msgs[0] : msgs;
//           toast.error(`${k}: ${msg}`);
//         });
//       } else {
//         toast.error("Failed to add configuration.");
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleDelete = async () => {
//     if (!deleteId) return;
//     try {
//       await deleteRouteGroupCountryApi(deleteId, moduleName);
//       toast.success("Configuration removed.");
//       setDeleteId(null);
//       fetchConfigs();
//       onSuccess();
//     } catch {
//       toast.error("Failed to remove configuration.");
//     }
//   };

//   const configuredCountryIds = new Set(configs.map((c) => String(c.country)));
//   const availableCountries = countryOptions.filter((o) => !configuredCountryIds.has(o.value));

//   return (
//     <>
//       <Modal
//         isOpen={isOpen}
//         onClose={onClose}
//         title={`Country Routing Config: ${routeGroupName || ""}`}
//         className="max-w-2xl"
//       >
//         <div className="space-y-5 px-1">
//           {/* Existing configs */}
//           <div>
//             <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
//               Configured Countries
//             </h3>
//             {isLoading ? (
//               <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
//             ) : configs.length === 0 ? (
//               <p className="text-sm text-gray-400 py-4 text-center">
//                 No countries configured yet. Add one below.
//               </p>
//             ) : (
//               <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
//                 <table className="min-w-full text-sm">
//                   <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
//                     <tr>
//                       <th className="px-4 py-2 text-left font-semibold border-b dark:border-gray-700">Country</th>
//                       <th className="px-4 py-2 text-left font-semibold border-b dark:border-gray-700">Routing Type</th>
//                       <th className="px-4 py-2 text-left font-semibold border-b dark:border-gray-700">Status</th>
//                       <th className="px-4 py-2 border-b dark:border-gray-700"></th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {configs.map((cfg) => (
//                       <tr key={cfg.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
//                         <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200 font-medium">{cfg.countryName}</td>
//                         <td className="px-4 py-2.5">
//                           <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cfg.routingType === "PERCENTAGE" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}`}>
//                             {cfg.routingType}
//                           </span>
//                         </td>
//                         <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{cfg.status}</td>
//                         <td className="px-4 py-2.5 text-center">
//                           <button
//                             onClick={() => setDeleteId(cfg.id!)}
//                             className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
//                           >
//                             <Trash2 size={15} />
//                           </button>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </div>

//           {/* Add new config */}
//           <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
//             <legend className="text-sm font-semibold text-primary px-2">Add Country Config</legend>
//             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//               <Select
//                 label="Country"
//                 value={newForm.country}
//                 onChange={(v) => setNewForm((p) => ({ ...p, country: v }))}
//                 options={availableCountries}
//                 placeholder="Select Country"
//               />
//               <Select
//                 label="Routing Type"
//                 value={newForm.routingType}
//                 onChange={(v) => setNewForm((p) => ({ ...p, routingType: v }))}
//                 options={routingTypeOptions}
//               />
//               <Select
//                 label="Status"
//                 value={newForm.status}
//                 onChange={(v) => setNewForm((p) => ({ ...p, status: v }))}
//                 options={statusOptions}
//               />
//             </div>
//             <div className="flex justify-end mt-4">
//               <Button
//                 type="button"
//                 variant="primary"
//                 onClick={handleAdd}
//                 disabled={isSubmitting || !newForm.country}
//                 leftIcon={<Plus size={16} />}
//               >
//                 {isSubmitting ? "Adding..." : "Add Config"}
//               </Button>
//             </div>
//           </fieldset>

//           <div className="flex justify-end pt-1">
//             <Button type="button" variant="secondary" onClick={onClose}>
//               Close
//             </Button>
//           </div>
//         </div>
//       </Modal>

//       <DeleteModal
//         isOpen={!!deleteId}
//         onClose={() => setDeleteId(null)}
//         onConfirm={handleDelete}
//         title="Remove Country Config"
//         message="Remove this country's routing configuration? Existing sub-routes for this country may no longer work."
//       />
//     </>
//   );
// };
