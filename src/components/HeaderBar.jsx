// src/components/HeaderBar.jsx
import { CheckCircle, Menu, X } from "lucide-react";
import { useState } from "react";

export default function HeaderBar({
  activeView,
  setActiveView,
  checkBalance,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const views = [
    { key: "schedule", label: "Schedule" },
    { key: "stats", label: "Stats" },
    { key: "call", label: "Call/Float" },
    { key: "calendar", label: "Calendar" },
    { key: "clinic", label: "Clinic" },
    { key: "vacRequests", label: "Vacations" },
  ];

  return (
    <div className="bg-white border-b-2 border-gray-400 sticky top-0 z-50">
      {/* Title Bar */}
      <div className="px-3 py-2 border-b border-gray-300 flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-800">Fellow<span className="text-red-400 italic">Shift</span></h1>
        
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-600 hover:text-gray-800"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Button Bar */}
      <div className="hidden md:flex px-3 py-2 items-center justify-center gap-4">
        <div className="flex items-center gap-1">
          {views.map((v) => (
            <button
              key={v.key}
              onClick={() => setActiveView(v.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeView === v.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-gray-300"></div>

        <button
          onClick={checkBalance}
          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition-colors"
          type="button"
        >
          <CheckCircle className="w-3 h-3" />
          Check Balance
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="p-2 grid grid-cols-2 gap-2">
            {views.map((v) => (
              <button
                key={v.key}
                onClick={() => {
                  setActiveView(v.key);
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-2 text-sm font-semibold rounded transition-colors ${
                  activeView === v.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-gray-200">
            <button
              onClick={() => {
                checkBalance();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded"
              type="button"
            >
              <CheckCircle className="w-4 h-4" />
              Check Balance
            </button>
          </div>
        </div>
      )}
    </div>
  );
}