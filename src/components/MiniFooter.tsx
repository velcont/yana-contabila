import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

const MiniFooter = () => {
  return (
    <div className="w-full py-6 mt-8 border-t border-border/40">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <a 
            href="mailto:office@velcont.com" 
            className="hover:text-primary transition-colors"
          >
            office@velcont.com
          </a>
        </div>
        <span className="hidden sm:inline">•</span>
        <Link 
          to="/contact" 
          className="hover:text-primary transition-colors underline-offset-4 hover:underline"
        >
          Contactează-ne
        </Link>
      </div>
    </div>
  );
};

export default MiniFooter;
