import { Toaster as Sonner } from "sonner";
import "./sonner.css";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      closeButton
      toastOptions={{ className: "app-toast" }}
    />
  );
}
