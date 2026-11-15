import { BrowserRouter, Route, Routes, useParams } from "react-router";
import RootPage from "./pages/root/RootPage";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootPage key="draft" />} />
        <Route path="/:reportId" element={<ReportRoute />} />
        <Route path="*" element={<ReportRoute />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

function ReportRoute() {
  const { reportId } = useParams();
  return <RootPage key={reportId ?? "missing"} reportId={reportId ?? "invalid"} />;
}
