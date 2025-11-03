import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface CRMContextType {
  selectedCompanies: string[];
  setSelectedCompanies: (ids: string[]) => void;
  toggleCompany: (id: string) => void;
  selectAllCompanies: (companyIds: string[]) => void;
  clearSelection: () => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider = ({ children }: { children: ReactNode }) => {
  // Initialize from localStorage
  const [selectedCompanies, setSelectedCompaniesState] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("crm_selected_companies");
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Error loading selected companies from localStorage:", error);
      return [];
    }
  });

  // Persist to localStorage whenever selection changes
  useEffect(() => {
    try {
      localStorage.setItem("crm_selected_companies", JSON.stringify(selectedCompanies));
    } catch (error) {
      console.error("Error saving selected companies to localStorage:", error);
    }
  }, [selectedCompanies]);

  const setSelectedCompanies = (ids: string[]) => {
    setSelectedCompaniesState(ids);
  };

  const toggleCompany = (id: string) => {
    setSelectedCompaniesState(prev => 
      prev.includes(id) 
        ? prev.filter(cid => cid !== id) 
        : [...prev, id]
    );
  };

  const selectAllCompanies = (companyIds: string[]) => {
    if (selectedCompanies.length === companyIds.length) {
      setSelectedCompaniesState([]);
    } else {
      setSelectedCompaniesState(companyIds);
    }
  };

  const clearSelection = () => {
    setSelectedCompaniesState([]);
  };

  return (
    <CRMContext.Provider value={{ 
      selectedCompanies, 
      setSelectedCompanies, 
      toggleCompany, 
      selectAllCompanies,
      clearSelection 
    }}>
      {children}
    </CRMContext.Provider>
  );
};

export const useCRMSelection = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error("useCRMSelection must be used within CRMProvider");
  }
  return context;
};
