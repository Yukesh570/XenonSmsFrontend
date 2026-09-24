import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";
import Modal from "../../ui/Modal";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Button from "../../ui/Button";
import {
  createUserApi,
  updateUserApi,
  type UserCreationData,
} from "../../../api/settingApi/userCreationApi/userCreationApi";

interface UserCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  moduleName: string;
  editingUser: UserCreationData | null;
  isViewMode?: boolean;
}

const userTypeOptions = [
  { value: "ADMIN", label: "ADMIN" },
  { value: "SALES", label: "SALES" },
  { value: "SUPPORT", label: "SUPPORT" },
  { value: "NOC", label: "NOC" },
  { value: "RATE", label: "RATE" },
  { value: "FINANCE", label: "FINANCE" },
  { value: "ACCOUNT_MANAGER", label: "ACCOUNT MANAGER" },
];

export const UserCreationModal: React.FC<UserCreationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  moduleName,
  editingUser,
  isViewMode = false,
}) => {
  const [formData, setFormData] = useState<UserCreationData>({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
    userType: "ADMIN",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingUser) {
        setFormData({
          username: editingUser.username || "",
          email: editingUser.email || "",
          phone: editingUser.phone || "",
          password: "",
          confirm_password: "",
          userType: editingUser.userType || "ADMIN",
        });
      } else {
        setFormData({
          username: "",
          email: "",
          phone: "",
          password: "",
          confirm_password: "",
          userType: "ADMIN",
        });
      }
    }
  }, [isOpen, editingUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof UserCreationData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;

    if (!formData.username.trim()) {
      toast.error("Username is required.");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required.");
      return;
    }

    if (!editingUser) {
      if (!formData.password) {
        toast.error("Password is required.");
        return;
      }
      if (formData.password !== formData.confirm_password) {
        toast.error("Passwords do not match.");
        return;
      }
    } else if (formData.password && formData.password !== formData.confirm_password) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        username: formData.username,
        email: formData.email,
        phone: formData.phone || "",
        userType: formData.userType,
      };

      if (!editingUser) {
        payload.password = formData.password;
        payload.confirm_password = formData.confirm_password;
      } else if (formData.password) {
        payload.password = formData.password;
        payload.confirm_password = formData.confirm_password;
      }

      if (editingUser?.id) {
        await updateUserApi(editingUser.id, payload, moduleName);
        toast.success("User updated successfully!");
      } else {
        await createUserApi(payload, moduleName);
        toast.success("User created successfully!");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to save user:", error);
      const serverError = error.response?.data;
      if (serverError && typeof serverError === "object") {
        Object.entries(serverError).forEach(([key, msgs]) => {
          const msgText = Array.isArray(msgs) ? msgs.join(", ") : String(msgs);
          toast.error(`${key}: ${msgText}`);
        });
      } else {
        toast.error(error.response?.data?.message || "Failed to save user.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isViewMode
          ? "View User"
          : editingUser
          ? "Edit User"
          : "Add New User"
      }
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 px-1" noValidate>
        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <legend className="text-sm font-semibold text-primary px-2">
            Account Information
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="e.g. john_doe"
              required
              disabled={isViewMode}
            />
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@example.com"
              required
              disabled={isViewMode}
            />
            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              value={formData.phone || ""}
              onChange={handleChange}
              placeholder="e.g. 98xxxxxxxx"
              disabled={isViewMode}
            />
            <Select
              label="User Type"
              value={formData.userType}
              onChange={(val) => handleSelectChange("userType", val)}
              options={userTypeOptions}
              disabled={isViewMode}
            />
          </div>
        </fieldset>

        {!isViewMode && (
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <legend className="text-sm font-semibold text-primary px-2">
              {editingUser ? "Change Password (Optional)" : "Security & Password"}
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password || ""}
                onChange={handleChange}
                placeholder="Enter password"
                required={!editingUser}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
              <Input
                label="Confirm Password"
                name="confirm_password"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirm_password || ""}
                onChange={handleChange}
                placeholder="Confirm password"
                required={!editingUser}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
            </div>
          </fieldset>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : editingUser
                ? "Update User"
                : "Create User"}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};