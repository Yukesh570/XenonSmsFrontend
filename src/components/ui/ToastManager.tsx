import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ToastManager = () => {
  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      style={{ zIndex: 999999 }}
    //   hideProgressBar
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="colored"
    />
  );
};

export default ToastManager;