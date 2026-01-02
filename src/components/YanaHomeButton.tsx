import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const YanaHomeButton = () => {
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      onClick={() => navigate('/yana')}
      className="gap-2 hover:bg-primary/10"
    >
      {/* Logo Y în cercul gradient - consistent cu pagina /yana */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm">
        Y
      </div>
      <span className="hidden sm:inline font-semibold text-foreground">YANA</span>
    </Button>
  );
};

export default YanaHomeButton;
