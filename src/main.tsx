import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./context/themeContext.tsx";
import { NavItemProvider } from "./context/navItemsContext.tsx";
import { TabProvider } from "./context/TabContext.tsx";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <NavItemProvider>
          <TabProvider>
            <App />
          </TabProvider>
        </NavItemProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);