import { useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";
import ToastManager from "./components/ui/ToastManager";

function App() {
  useEffect(() => {
    const handleWheel = () => {
      if (
        document.activeElement instanceof HTMLInputElement &&
        document.activeElement.type === "number"
      ) {
        document.activeElement.blur();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <>
      <AppRoutes />

      <ToastManager />
    </>
  );
}

export default App;
