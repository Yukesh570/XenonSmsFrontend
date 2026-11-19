import React from "react";
import { Navigate } from "react-router-dom";

const VendorCompatibilityPage: React.FC = () => {
  return <Navigate to="/routeManager/vendorTransform?tab=compatibility" replace />;
};

export default VendorCompatibilityPage;

